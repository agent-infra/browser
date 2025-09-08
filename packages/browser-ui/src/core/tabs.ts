import { proxy, subscribe } from 'valtio';
import { Tab } from './tab';
import type { Browser, CDPSession, Page, Target } from 'puppeteer-core';
import { TabEvents } from '../event/tabs';
import { Mutex } from '../utils/mutex';

import { TabMeta, TabsState, TabsOperationTracker } from '../types/tabs';
export class Tabs {
  #pptrBrowser: Browser;
  #tabs: Map<string, Tab>;
  #canvas: HTMLCanvasElement;
  #operations: TabsOperationTracker;
  #cdpSession: CDPSession | null = null;

  public state: TabsState;

  constructor(browser: Browser, canvas: HTMLCanvasElement) {
    this.#pptrBrowser = browser;
    this.#canvas = canvas;
    this.#tabs = new Map<string, Tab>();

    this.#operations = {
      creatingTargetIds: new Set<string>(),
      switchingTargetIds: new Set<string>(),
      closingTargets: new WeakSet<Target>(),
    };

    this.state = proxy({
      tabs: new Map<string, TabMeta>(),
      activeTabId: null,
    });

    this.#initializeExistingTabs();

    this.#pptrBrowser.on('targetcreated', (target) =>
      this.#handleTargetCreated(target),
    );
    this.#pptrBrowser.on('targetchanged', (target) =>
      console.log('targetchanged', target),
    );
    // this.#pptrBrowser.on('targetdestroyed', (target) =>
    //   this.#handleTargetEvent('destroyed', target),
    // );
  }

  subscribe(callback: () => void): () => void {
    return subscribe(this.state, callback);
  }

  getSnapshot(): TabsState {
    return {
      tabs: new Map(this.state.tabs),
      activeTabId: this.state.activeTabId,
    };
  }

  // #region createTab

  #cteateMutex = new Mutex();
  async #createTab(targetId: string, pptrPage: Page) {
    using _ = await this.#cteateMutex.acquire();

    if (this.#operations.creatingTargetIds.has(targetId)) {
      return targetId;
    }
    this.#operations.creatingTargetIds.add(targetId);

    const tab = new Tab(pptrPage, this.#canvas);

    this.#tabs.set(targetId, tab);
    this.#setupTabEvents(tab, targetId);
    await this.#syncTabMeta(targetId);

    return targetId;
  }

  async #initializeExistingTabs() {
    const existingPages = await this.#pptrBrowser.pages();

    // console.log('initializeExistingTabs', existingPages);

    if (existingPages.length === 0) {
      return;
    }

    let activeTabId: string = '';
    let firstTabId: string = '';
    for (const pptrPage of existingPages) {
      // @ts-ignore
      const tabId = pptrPage.target()._targetId;
      await this.#createTab(tabId, pptrPage);
      const tab = this.#tabs.get(tabId)!;

      if (!firstTabId) {
        firstTabId = tabId;
      }

      if (await tab.checkActiveStatusWithRuntime()) {
        activeTabId = tabId;
      }
    }

    if (!activeTabId) {
      activeTabId = firstTabId;
    }

    await this.#activeTab(activeTabId);
  }

  async #handleTargetCreated(target: Target) {
    if (target.type() !== 'page') {
      return;
    }
    const pptrPage = await target.page();
    if (!pptrPage) {
      return;
    }
    // @ts-ignore
    const targetId = target._targetId;

    await this.#createTab(targetId, pptrPage);
    await this.#activeTab(targetId);

    return targetId;
  }

  async createTab(): Promise<string> {
    const pptrPage = await this.#pptrBrowser.newPage();
    // @ts-ignore
    const targetId = pptrPage.target()._targetId;

    await this.#createTab(targetId, pptrPage);
    await this.#activeTab(targetId);

    return targetId;
  }

  // #endregion

  // #region activeTab

  #activeMutex = new Mutex();
  async #activeTab(tabId: string) {
    using _ = await this.#activeMutex.acquire();
    // console.log(
    //   'switchingTargetIds before',
    //   tabId,
    //   this.#operations.switchingTargetIds,
    // );

    // check lock
    if (this.#operations.switchingTargetIds.has(tabId)) {
      return false;
    }
    this.#operations.switchingTargetIds.add(tabId);

    // check tab existence
    const tab = this.#tabs.get(tabId);
    if (!tab) {
      this.#operations.switchingTargetIds.delete(tabId);
      return false;
    }
    if (this.state.activeTabId === tabId) {
      this.#operations.switchingTargetIds.delete(tabId);
      return true;
    }

    // active select tab
    this.state.activeTabId = tabId;
    await tab.active();
    await this.#syncTabMeta(this.state.activeTabId);

    // inactivate other tabs
    const inactivePromises = [];
    for (const [id, tabInstance] of this.#tabs) {
      if (id !== tabId) {
        inactivePromises.push(tabInstance.inactive());
      }
    }
    await Promise.all(inactivePromises);

    // release lock
    this.#operations.switchingTargetIds.delete(tabId);

    // console.log(
    //   'switchingTargetIds after',
    //   tabId,
    //   this.#operations.switchingTargetIds,
    // );
    // console.log('#activeTab this.state', tabId, this.state);

    return true;
  }

  async #handleTargetChanged(target: Target) {
    console.log('handleTargetChanged', target);

    if (target.type() !== 'page') {
      return false;
    }
    const page = await target.page();
    if (!page) {
      return false;
    }

    // @ts-ignore
    const targetId: string = target._targetId;
    console.log('handleTargetChanged', targetId);

    return await this.#activeTab(targetId);
  }

  async activeTab(tabId: string): Promise<boolean> {
    console.log('public activeTab', tabId);

    return await this.#activeTab(tabId);
  }

  getActiveTab(): Tab | null {
    if (!this.state.activeTabId) return null;
    return this.#tabs.get(this.state.activeTabId) || null;
  }

  // #endregion

  // #region closeTab

  async closeTab(tabId: string): Promise<boolean> {
    const tab = this.#tabs.get(tabId);
    if (!tab) {
      return false;
    }

    const target = tab.target;
    if (this.#operations.closingTargets.has(target)) {
      return false;
    }

    this.#operations.closingTargets.add(target);

    try {
      await tab.close();
      await this.#removeTab(tabId);
      return true;
    } finally {
      this.#operations.closingTargets.delete(target);
    }
  }

  async #handleTargetDestroyed(target: Target): Promise<void> {
    const tabId = this.#findTabIdByTarget(target);
    if (tabId && !this.#operations.closingTargets.has(target)) {
      await this.#removeTab(tabId);
    }
  }

  // #endregion

  // #region public methods

  async goBack(): Promise<boolean> {
    const activeTab = this.getActiveTab();

    if (!activeTab) {
      return false;
    }

    return await activeTab.goBack(['load']);
  }

  async goForward(): Promise<boolean> {
    const activeTab = this.getActiveTab();

    if (!activeTab) {
      return false;
    }

    return await activeTab.goForward(['load']);
  }

  async reload(): Promise<boolean> {
    const activeTab = this.getActiveTab();

    if (!activeTab) {
      return false;
    }

    try {
      await activeTab.reload();
      return true;
    } catch (error) {
      console.error('Reload failed:', error);
      return false;
    }
  }

  async navigate(url: string): Promise<boolean> {
    const activeTab = this.getActiveTab();

    if (!activeTab) {
      return false;
    }

    try {
      await activeTab.goto(url);
      return true;
    } catch (error) {
      console.error('Navigation failed:', error);
      return false;
    }
  }

  getCurrentUrl(): string {
    const activeTab = this.getActiveTab();
    return activeTab ? activeTab.url : 'about:blank';
  }

  hasTab(tabId: string): boolean {
    return this.state.tabs.has(tabId);
  }

  async destroy(): Promise<void> {
    const closeTasks = Array.from(this.#tabs.keys()).map((tabId) =>
      this.closeTab(tabId),
    );
    await Promise.all(closeTasks);
  }

  // #endregion

  // #region private methods

  async #handleTargetEvent(
    eventType: 'created' | 'changed' | 'destroyed',
    target: Target,
  ): Promise<void> {
    if (target.type() !== 'page') {
      return;
    }

    if (this.#operations.switchingTargetIds.has(target)) {
      return;
    }

    this.#operations.switchingTargetIds.add(target);

    try {
      switch (eventType) {
        case 'created':
          await this.#handleTargetCreated(target);
          break;
        case 'changed':
          await this.#handleTargetChanged(target);
          break;
        case 'destroyed':
          await this.#handleTargetDestroyed(target);
          break;
      }
    } finally {
      this.#operations.switchingTargetIds.delete(target);
    }
  }

  #findTabIdByPage(page: Page): string | null {
    for (const [tabId, tab] of this.#tabs) {
      if (tab.page === page) {
        return tabId;
      }
    }
    return null;
  }

  #findTabIdByTarget(target: Target): string | null {
    for (const [tabId, tab] of this.#tabs) {
      if (tab.target === target) {
        return tabId;
      }
    }
    return null;
  }

  async #removeTab(tabId: string): Promise<void> {
    this.#tabs.delete(tabId);
    this.state.tabs.delete(tabId);

    if (this.state.activeTabId === tabId) {
      this.state.activeTabId = null;

      const lastTabId = Array.from(this.state.tabs.keys()).pop();
      if (lastTabId) {
        await this.activeTab(lastTabId);
      } else {
        await this.createTab();
      }
    }
  }

  async #syncTabMeta(tabId: string): Promise<void> {
    const tab = this.#tabs.get(tabId);
    if (!tab) return;

    const [title, favicon] = await Promise.all([
      tab.getTitle().catch(() => 'Loading...'),
      tab.getFavicon().catch(() => null),
    ]);

    const tabMeta: TabMeta = {
      id: tabId,
      title,
      url: tab.url,
      favicon,
      isLoading: false,
      isActive: tabId === this.state.activeTabId,
    };

    this.state.tabs.set(tabId, tabMeta);
  }

  #setupTabEvents(tab: Tab, tabId: string): void {
    tab.on(TabEvents.TabLoadingStateChanged, () => {
      this.#syncTabMeta(tabId);
    });
  }

  // #endregion
}
