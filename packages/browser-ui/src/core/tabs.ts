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

export class Tabs {
  #pptrBrowser: Browser;
  #canvas: HTMLCanvasElement;
  #tabs: Map<string, Tab>;
  #creatingPages: WeakSet<Page>; // 使用 WeakSet 跟踪正在创建的 Page 对象
  public state: TabsState;

  constructor(browser: Browser, canvas: HTMLCanvasElement) {
    this.#pptrBrowser = browser;
    this.#canvas = canvas;
    this.#tabs = new Map<string, Tab>();
    this.#creatingPages = new WeakSet<Page>();
    
    this.state = proxy({
      tabs: new Map<string, TabMeta>(),
      activeTabId: null,
    });

    this.#initializeExistingTabs();

    this.#pptrBrowser.on('targetcreated', this.#handleTargetCreated.bind(this));
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

  async createTab(url?: string): Promise<string> {
    const pptrPage = await this.#pptrBrowser.newPage();

    this.#creatingPages.add(pptrPage);

    const tab = new Tab(pptrPage, this.#canvas);
    const tabId = tab.getTabId();

    this.#tabs.set(tabId, tab);
    this.#setupTabEvents(tab, tabId);

    if (!this.state.activeTabId || this.state.tabs.size === 0) {
      await this.activeTab(tabId);
    }

    if (url) {
      await tab.goto(url);
    }

    await this.#syncTabMeta(tabId);

    this.#creatingPages.delete(pptrPage);

    return tabId;
  }

  async closeTab(tabId: string): Promise<boolean> {
    const tab = this.#tabs.get(tabId);
    if (!tab) return false;

    await tab.close();

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

    return true;
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
    return activeTab ? activeTab.getUrl() : 'about:blank';
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
      url: tab.getUrl(),
      favicon,
      isLoading: false,
      isActive: tabId === this.state.activeTabId,
    };

    this.state.tabs.set(tabId, tabMeta);
  }

  async #handlePopupCreated(newPage: Page): Promise<void> {
    const tab = new Tab(newPage, this.#canvas);
    const tabId = tab.getTabId();

    this.#tabs.set(tabId, tab);
    this.#setupTabEvents(tab, tabId);

    await this.activeTab(tabId);
    await this.#syncTabMeta(tabId);
  }

  async #initializeExistingTabs(): Promise<void> {
    const existingPages = await this.#pptrBrowser.pages();

    if (existingPages.length === 0) {
      return;
    }

    const initPromises = existingPages.map(async (page) => {
      const tab = new Tab(page, this.#canvas);
      const tabId = tab.getTabId();

      this.#setupTabEvents(tab, tabId);
      this.#tabs.set(tabId, tab);

      return tabId;
    });

    const tabIds = await Promise.all(initPromises);

    if (tabIds.length > 0) {
      await this.activeTab(tabIds[0]);
    }

    await Promise.all(tabIds.map((tabId) => this.#syncTabMeta(tabId)));
  }

  #setupTabEvents(tab: Tab, tabId: string): void {
    tab.on(TabEvents.TabLoadingStateChanged, () => {
      this.#syncTabMeta(tabId);
    });
  }

  async #handleTargetCreated(target: Target): Promise<void> {
    if (target.type() !== 'page') {
      return;
    }
    if (!target.opener()) {
      return;
    }

    const newPage = await target.page();
    if (!newPage) {
      return;
    }
    if (this.#creatingPages.has(newPage)) {
      return;
    }

    await this.#handlePopupCreated(newPage);
  }
}