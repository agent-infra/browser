import { proxy, subscribe } from 'valtio';
import { Tab } from './tab';
import type { Browser } from 'puppeteer-core';

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
  public state: TabsState;

  constructor(browser: Browser, canvas: HTMLCanvasElement) {
    this.#pptrBrowser = browser;
    this.#canvas = canvas;

    this.#tabs = new Map<string, Tab>();
    this.state = proxy({
      tabs: new Map<string, TabMeta>(),
      activeTabId: null,
    });
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

    const tab = new Tab(pptrPage, this.#canvas);
    const tabId = tab.getTabId();

    this.#tabs.set(tabId, tab);

    tab.on('loadingStateChanged', () => {
      this.#syncTabMeta(tabId);
    });

    if (!this.state.activeTabId || this.state.tabs.size === 0) {
      await this.activeTab(tabId);
    }

    if (url) {
      await tab.goto(url);
    }

    await this.#syncTabMeta(tabId);

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

      // close active tab, switch to last tab or create a new one
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

    // 1.sync previous active tab meta
    if (this.state.activeTabId && this.state.activeTabId !== tabId) {
      await this.#syncTabMeta(this.state.activeTabId);
    }

    // 2.active current tab
    this.state.activeTabId = tabId;
    await tab.active();

    // 3.inactive other tabs
    const inactivePromises = [];
    for (const [id, tabInstance] of this.#tabs) {
      if (id !== tabId) {
        inactivePromises.push(tabInstance.inactive());
      }
    }
    await Promise.all(inactivePromises);

    // 4.sync current active tab meta
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
      isLoading: false, // 可以从 tab 实例获取真实状态
      isActive: tabId === this.state.activeTabId,
    };

    this.state.tabs.set(tabId, tabMeta);
  }

  async destroy(): Promise<void> {
    const closeTasks = Array.from(this.#tabs.keys()).map((tabId) =>
      this.closeTab(tabId),
    );
    await Promise.all(closeTasks);
  }
}
