import { proxy, subscribe } from 'valtio';
import { proxyMap } from 'valtio/utils';
import { Tab } from './tab';
import type { Browser, Page, Target } from 'puppeteer-core';
import { Mutex } from '../utils/mutex';

import {
  TabEvents,
  TabEventsMap,
  TabMeta,
  TabsState,
  TabsOperationTracker,
} from '../types/tabs';

export class Tabs {
  #pptrBrowser: Browser;
  #tabs: Map<string, Tab>;
  #canvas: HTMLCanvasElement;
  #operations: TabsOperationTracker;

  public state: TabsState;

  constructor(browser: Browser, canvas: HTMLCanvasElement) {
    this.#pptrBrowser = browser;
    this.#canvas = canvas;

    this.#tabs = new Map<string, Tab>();
    this.state = proxy({
      tabs: proxyMap<string, TabMeta>(),
      activeTabId: null,
    });
    this.#operations = {
      creatingTargetIds: new Set<string>(),
      switchingTargetIds: new Set<string>(),
      closingTargetIds: new Set<string>(),
    };

    this.#initializeExistingTabs();

    // tabs events
    this.#pptrBrowser.on('targetcreated', (target) =>
      this.#handleTargetCreated(target),
    );
    this.#pptrBrowser.on('targetdestroyed', (target) =>
      this.#handleTargetDestroyed(target),
    );
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

  // #region init ExistingTabs

  async #initializeExistingTabs() {
    const existingPages = await this.#pptrBrowser.pages();

    console.log('initializeExistingTabs', existingPages);

    if (existingPages.length === 0) {
      return;
    }

    // init all existing tabs
    const initTabTasks = existingPages
      .filter((pptrPage) => !pptrPage.url().startsWith('devtools://')) // not allowed chrome devtools frontend
      .map(async (pptrPage) => {
        // @ts-ignore
        const tabId = pptrPage.target()._targetId;
        const tab = new Tab(tabId, pptrPage, this.#canvas);

        this.#tabs.set(tabId, tab);
        this.#setupTabEvents(tab, tabId);
        await this.#syncTabMeta(tabId);

        const isActive = await tab.checkActiveStatusWithRuntime();
        return { tabId, pptrPage, isActive };
      });
    const initedTabs = await Promise.all(initTabTasks);

    // active tab
    let activeTabId = initedTabs.find((result) => result.isActive)?.tabId;
    if (!activeTabId) {
      activeTabId = initedTabs[0].tabId;
    }

    await this.#activeTab(activeTabId);
  }

  // #endregion

  // #region createTab

  #cteateMutex = new Mutex();
  async #createTab(targetId: string, pptrPage: Page) {
    using _ = await this.#cteateMutex.acquire();

    if (this.#operations.creatingTargetIds.has(targetId)) {
      return targetId;
    }
    this.#operations.creatingTargetIds.add(targetId);

    const tab = new Tab(targetId, pptrPage, this.#canvas);

    this.#tabs.set(targetId, tab);
    this.#setupTabEvents(tab, targetId);
    await this.#syncTabMeta(targetId);

    return targetId;
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

    console.log('handleTargetCreated', targetId);

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

  #closeMutex = new Mutex();
  async #closeTab(tabId: string): Promise<boolean> {
    using _ = await this.#closeMutex.acquire();

    // check
    if (this.#operations.closingTargetIds.has(tabId)) {
      return false;
    }
    this.#operations.closingTargetIds.add(tabId);

    // close tab
    const tab = this.#tabs.get(tabId);
    if (!tab) {
      return false;
    }
    await tab.close();
    this.#tabs.delete(tabId);
    this.state.tabs.delete(tabId);

    // active page
    if (this.state.activeTabId === tabId) {
      this.state.activeTabId = null;

      const lastTabId = Array.from(this.state.tabs.keys()).pop();
      if (lastTabId) {
        await this.activeTab(lastTabId);
      } else {
        await this.createTab();
      }
    }

    return true;
  }

  async #handleTargetDestroyed(target: Target) {
    if (target.type() !== 'page') {
      return;
    }

    // @ts-ignore
    const targetId = target._targetId;
    await this.#closeTab(targetId);
  }

  async closeTab(tabId: string): Promise<boolean> {
    return await this.#closeTab(tabId);
  }

  // #endregion

  // #region public methods

  #backMutex = new Mutex();
  async goBack(): Promise<boolean> {
    using _ = await this.#backMutex.acquire();

    const activeTab = this.getActiveTab();

    if (!activeTab) {
      return false;
    }

    return await activeTab.goBack(['load']);
  }

  #forwardMutex = new Mutex();
  async goForward(): Promise<boolean> {
    using _ = await this.#forwardMutex.acquire();

    const activeTab = this.getActiveTab();

    if (!activeTab) {
      return false;
    }

    return await activeTab.goForward(['load']);
  }

  #reloadMutex = new Mutex();
  async reload(): Promise<boolean> {
    using _ = await this.#reloadMutex.acquire();

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

  async #syncTabMeta(tabId: string, isLoading = false): Promise<void> {
    const tab = this.#tabs.get(tabId);
    if (!tab) return;

    const [title, favicon] = await Promise.all([
      tab.getTitle().catch(() => 'Loading...'),
      tab.getFavicon().catch(() => null),
    ]);

    const tabMeta: TabMeta = {
      id: tabId,
      url: tab.url || 'about:blank',
      title: title,
      favicon: favicon,
      isLoading: isLoading,
      isActive: tabId === this.state.activeTabId,
    };

    // console.log('syncTabMeta', tabId, tabMeta);

    this.state.tabs.set(tabId, tabMeta);
  }

  #setupTabEvents(tab: Tab, tabId: string): void {
    tab.on(
      TabEvents.TabLoadingStateChanged,
      (event: TabEventsMap[TabEvents.TabLoadingStateChanged]) => {
        this.#syncTabMeta(tabId, event.isLoading);
      },
    );
    tab.on(TabEvents.TabUrlChanged, () => {
      this.#syncTabMeta(tabId);
    });
    tab.on(
      TabEvents.TabVisibilityChanged,
      (event: TabEventsMap[TabEvents.TabVisibilityChanged]) => {
        // console.log('TabVisibilityChanged', event);

        if (event.isVisible) {
          this.#activeTab(event.tabId);
        }
      },
    );
  }

  // #endregion
}
