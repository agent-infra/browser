import { proxy, subscribe } from 'valtio';
import { Tab } from './tab';
import type { Browser, Page, Target } from 'puppeteer-core';
import { TabEvents } from '../event/tabs';

export interface TabMeta {
  id: string;
  title: string;
  url: string;
  favicon: string | null;
  isLoading: boolean;
  isActive: boolean;
}

export interface TabsState {
  tabs: Map<string, TabMeta>;
  activeTabId: string | null;
}

interface OperationTracker {
  creatingTargetId: Set<string>;
  processingTargets: WeakSet<Target>;
  closingTargets: WeakSet<Target>;
}

export class Tabs {
  #pptrBrowser: Browser;
  #tabs: Map<string, Tab>;
  #canvas: HTMLCanvasElement;
  #operations: OperationTracker;

  public state: TabsState;

  constructor(browser: Browser, canvas: HTMLCanvasElement) {
    this.#pptrBrowser = browser;
    this.#canvas = canvas;
    this.#tabs = new Map<string, Tab>();

    this.#operations = {
      creatingTargetId: new Set<string>(),
      processingTargets: new WeakSet<Target>(),
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
    // this.#pptrBrowser.on('targetchanged', (target) =>
    //   this.#handleTargetEvent('changed', target),
    // );
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

  async #createTab(pptrPage: Page, from: string) {
    const tab = new Tab(pptrPage, this.#canvas);
    const tabId = tab.tabId;

    console.log('#createTab', tabId, from);

    if (this.#operations.creatingTargetId.has(tabId)) {
      return tabId;
    }
    this.#operations.creatingTargetId.add(tabId);

    this.#tabs.set(tabId, tab);
    this.#setupTabEvents(tab, tabId);
    await this.#syncTabMeta(tabId);

    this.#operations.creatingTargetId.delete(tabId);

    console.log('#createTab this.state', this.state);

    return tabId;
  }

  async #initializeExistingTabs() {
    const existingPages = await this.#pptrBrowser.pages();

    console.log('initializeExistingTabs', existingPages);

    if (existingPages.length === 0) {
      return;
    }

    const tabIds: string[] = [];
    for (const pptrPage of existingPages) {
      const tabId = await this.#createTab(pptrPage, 'init');
      tabIds.push(tabId);
    }

    // TODO: 需要加入 evaluate 代码检测真正 active 的逻辑
    await this.activeTab(tabIds[0]);

    return tabIds;
  }

  async #handleTargetCreated(target: Target) {
    if (target.type() !== 'page') {
      return;
    }

    const pptrPage = await target.page();
    if (!pptrPage) {
      return;
    }
    const tabId = await this.#createTab(pptrPage, 'event');

    await this.activeTab(tabId);

    return tabId;
  }

  async createTab(): Promise<string> {
    const pptrPage = await this.#pptrBrowser.newPage();
    const tabId = await this.#createTab(pptrPage, 'create');

    await this.activeTab(tabId);

    return tabId;
  }

  // #endregion

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

  async activeTab(tabId: string): Promise<boolean> {
    const tab = this.#tabs.get(tabId);

    if (!tab) {
      return false;
    }

    if (this.state.activeTabId && this.state.activeTabId !== tabId) {
      await this.#syncTabMeta(this.state.activeTabId);
    }

    this.state.activeTabId = tabId;
    await tab.active();

    const inactivePromises = [];
    for (const [id, tabInstance] of this.#tabs) {
      if (id !== tabId) {
        inactivePromises.push(tabInstance.inactive());
      }
    }
    await Promise.all(inactivePromises);

    await this.#syncTabMeta(tabId);

    return true;
  }

  getActiveTab(): Tab | null {
    if (!this.state.activeTabId) return null;
    return this.#tabs.get(this.state.activeTabId) || null;
  }

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

  async #handleTargetEvent(
    eventType: 'created' | 'changed' | 'destroyed',
    target: Target,
  ): Promise<void> {
    if (target.type() !== 'page') {
      return;
    }

    if (this.#operations.processingTargets.has(target)) {
      return;
    }

    this.#operations.processingTargets.add(target);

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
      this.#operations.processingTargets.delete(target);
    }
  }

  async #handleTargetChanged(target: Target): Promise<void> {
    const page = await target.page();
    if (!page) return;

    const tabId = this.#findTabIdByPage(page);
    if (tabId) {
      await this.#syncTabMeta(tabId);
    }
  }

  async #handleTargetDestroyed(target: Target): Promise<void> {
    const tabId = this.#findTabIdByTarget(target);
    if (tabId && !this.#operations.closingTargets.has(target)) {
      await this.#removeTab(tabId);
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
}
