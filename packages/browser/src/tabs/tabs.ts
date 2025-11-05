/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { proxy, subscribe } from 'valtio';
import { proxyMap } from 'valtio/utils';
import { Tab } from './tab';
import { validateNavigationUrl, Mutex } from '../utils';

import type { Browser, Page, Target } from 'puppeteer-core';
import {
  TabEvents,
  type TabEventsMap,
  type TabMeta,
  type TabOptions,
  type TabsState,
  type TabsOperationTracker,
  type TabsOptions,
  type DialogMeta,
} from '../types/tabs';

export class Tabs<T extends Tab = Tab> {
  #pptrBrowser: Browser;
  #tabs: Map<string, T>;
  #options: TabsOptions;

  #operations: TabsOperationTracker;

  public state: TabsState;
  #isIntentionalDestroy = false;

  static async create(browser: Browser, options: TabsOptions) {
    const tabs = new Tabs(browser, options);
    await tabs.initializeExistingTabs();
    return tabs;
  }

  constructor(browser: Browser, options: TabsOptions) {
    this.#pptrBrowser = browser;
    this.#options = options;

    this.#tabs = new Map<string, T>();
    this.state = proxy({
      tabs: proxyMap<string, TabMeta>(),
      activeTabId: null,
    });
    this.#operations = {
      creatingTargetIds: new Set<string>(),
      switchingTargetIds: new Set<string>(),
      closingTargetIds: new Set<string>(),
    };

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

  protected createTabInstance(page: Page, options: TabOptions): T {
    return new Tab(page, options) as T;
  }

  // #region init ExistingTabs

  protected async initializeExistingTabs() {
    const existingPages = await this.#pptrBrowser.pages();

    // console.log('initializeExistingTabs', existingPages);

    if (existingPages.length === 0) {
      return;
    }

    // init all existing tabs
    const initTabTasks = existingPages
      .filter((pptrPage) => !validateNavigationUrl(pptrPage.url()).ignored) // not allowed chrome devtools frontend
      .map(async (pptrPage) => {
        // @ts-ignore
        const tabId = pptrPage.target()._targetId;
        const tab = this.createTabInstance(pptrPage, {
          tabId: tabId,
          ...this.#options,
        });

        this.#tabs.set(tabId, tab);
        this.#setupTabEvents(tab, tabId);
        await this.#syncTabMeta(tabId);

        const isActive = await tab._checkActiveStatusWithRuntime();
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

    const tab = this.createTabInstance(pptrPage, {
      tabId: targetId,
      ...this.#options,
    });

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

    // console.trace('#activeTab', tabId);

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
    await tab._active();
    await this.#syncTabMeta(this.state.activeTabId);

    // inactivate other tabs
    const inactivePromises = [];
    for (const [id, tabInstance] of this.#tabs) {
      if (id !== tabId) {
        inactivePromises.push(tabInstance._inactive());
      }
    }
    await Promise.all(inactivePromises);

    // release lock
    this.#operations.switchingTargetIds.delete(tabId);

    return true;
  }

  async activeTab(tabId: string): Promise<boolean> {
    console.log('public activeTab', tabId);

    return await this.#activeTab(tabId);
  }

  getActiveTab(): T | null {
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
    await tab._close();
    this.#tabs.delete(tabId);
    this.state.tabs.delete(tabId);

    // fallback logic to prevent the browser from being closed directly
    if (this.state.activeTabId === tabId) {
      this.state.activeTabId = null;

      if (this.#tabs.size === 0 && !this.#isIntentionalDestroy) {
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

  getCurrentUrl(): string {
    const activeTab = this.getActiveTab();
    return activeTab ? activeTab.url : 'about:blank';
  }

  hasTab(tabId: string): boolean {
    return this.state.tabs.has(tabId);
  }

  async destroy(): Promise<void> {
    this.#isIntentionalDestroy = true;

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

    const [title, favicon, historyData] = await Promise.all([
      tab.getTitle().catch(() => 'Loading...'),
      tab.getFavicon().catch(() => ''),
      tab.getHistory().catch(() => ({
        index: 0,
        history: [],
        canGoBack: false,
        canGoForward: false,
      })),
    ]);

    const tabMeta: TabMeta = {
      id: tabId,
      url: tab.url || 'about:blank',
      title: title,
      favicon: favicon,
      isLoading: isLoading,
      isActive: tabId === this.state.activeTabId,
      canGoBack: historyData.canGoBack,
      canGoForward: historyData.canGoForward,
    };

    // console.log('syncTabMeta', tabId, tabMeta);

    this.state.tabs.set(tabId, tabMeta);
  }

  #updateTabDialog(tabId: string, dialogMeta: DialogMeta | null): void {
    const currentTabMeta = this.state.tabs.get(tabId);
    if (!currentTabMeta) return;

    const updatedTabMeta: TabMeta = {
      ...currentTabMeta,
      dialog: dialogMeta || undefined,
    };

    this.state.tabs.set(tabId, updatedTabMeta);
  }

  #setupTabEvents(tab: Tab, tabId: string): void {
    tab.on(
      TabEvents.TabLoadingStateChanged,
      (event: TabEventsMap[TabEvents.TabLoadingStateChanged]) => {
        const currentTabMeta = this.state.tabs.get(tabId);
        if (!currentTabMeta) return;

        const updatedTabMeta: TabMeta = {
          ...currentTabMeta,
          isLoading: event.isLoading,
        };

        this.state.tabs.set(tabId, updatedTabMeta);
      },
    );
    tab.on(
      TabEvents.TabUrlChanged,
      (event: TabEventsMap[TabEvents.TabUrlChanged]) => {
        const currentTabMeta = this.state.tabs.get(tabId);
        if (!currentTabMeta) return;

        const updatedTabMeta: TabMeta = {
          ...currentTabMeta,
          url: event.newUrl,
          title: event.title,
          favicon: event.favicon,
          canGoBack: event.canGoBack,
          canGoForward: event.canGoForward,
        };

        this.state.tabs.set(tabId, updatedTabMeta);
      },
    );
    tab.on(
      TabEvents.TabVisibilityChanged,
      (event: TabEventsMap[TabEvents.TabVisibilityChanged]) => {
        if (event.isVisible) {
          this.#activeTab(event.tabId);
        }
      },
    );
    tab.on(
      TabEvents.TabDialogChanged,
      (event: TabEventsMap[TabEvents.TabDialogChanged]) => {
        if (event.isOpen) {
          this.#updateTabDialog(tabId, {
            type: event.type!,
            message: event.message!,
            defaultValue: event.defaultValue!,
          });
        } else {
          this.#updateTabDialog(tabId, null);
        }
      },
    );
  }

  // #endregion
}
