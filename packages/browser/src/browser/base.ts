/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Browser as pptrBrowser, Viewport } from 'puppeteer-core';

import type { Tabs } from '../tabs/tabs';
import type { EnvInfo, UserAgentInfo } from '../types';

const MAX_RETRIES = 5;
const INITIAL_BACKOFF = 2000;

/**
 * Abstract base class for browser implementations
 * Contains common functionality shared between Browser and UIBrowser
 */
export abstract class BaseBrowser<TTabs extends Tabs> {
  public pptrBrowser?: pptrBrowser;
  public _tabs?: TTabs;
  public _envInfo?: EnvInfo;
  public wsEndpoint = '';
  public defaultViewport: Viewport = {
    width: 1280,
    height: 1024,
    deviceScaleFactor: 0,
    isMobile: false,
    isLandscape: false,
    hasTouch: false,
  };
  public isIntentionalDisconnect: boolean = false;
  public reconnectAttempts: number = 0;
  public userAgentInfo?: UserAgentInfo;

  constructor() {}

  // #region tabs

  private get tabs(): TTabs {
    if (!this._tabs) {
      throw new Error('Tabs not initialized');
    }
    return this._tabs;
  }

  getTabsSnapshot() {
    return this.tabs.getSnapshot();
  }

  subscribeTabChange(callback: () => void) {
    return this.tabs.subscribe(callback);
  }

  getActiveTab() {
    return this.tabs.getActiveTab();
  }

  async createTab() {
    return this.tabs.createTab();
  }

  async activeTab(tabId: string) {
    return this.tabs.activeTab(tabId);
  }

  async closeTab(tabId: string) {
    return this.tabs.closeTab(tabId);
  }

  async destroyAllTabs() {
    return this.tabs.destroy();
  }

  // #endregion

  // #region userAgent

  /**
   * Set the user agent for the browser and future tabs
   */
  setUserAgent(options: UserAgentInfo): void {
    this.userAgentInfo = options;
  }

  /**
   * Get the current user agent
   */
  async getUserAgent() {
    if (this.userAgentInfo) {
      return this.userAgentInfo;
    }

    const uaString = await this.pptrBrowser?.userAgent();
    return { userAgent: uaString };
  }

  // #endregion

  // #region other methods

  get envInfo(): any {
    return this._envInfo!;
  }

  async getBrowserMetaInfo() {
    if (!this.pptrBrowser) {
      throw new Error('Browser not initialized');
    }

    const userAgent = await this.pptrBrowser.userAgent();

    return {
      envInfo: this._envInfo!,
      userAgent,
      viewport: this.defaultViewport,
      wsEndpoint: this.wsEndpoint,
    };
  }

  async disconnect(): Promise<void> {
    this.isIntentionalDisconnect = true;
    if (this._tabs && typeof (this._tabs as any).destroy === 'function') {
      await (this._tabs as any).destroy();
    }
    await this.pptrBrowser?.disconnect();
  }

  public setDefaultViewport(viewport?: Viewport | null): Viewport {
    if (!viewport) {
      return this.defaultViewport;
    }

    if (typeof viewport === 'object') {
      this.defaultViewport = {
        ...this.defaultViewport,
        ...viewport,
      };
    }

    return this.defaultViewport;
  }

  // #endregion

  // #region reconnect logic

  public setupAutoReconnect(): void {
    if (!this.pptrBrowser) return;

    this.pptrBrowser.on('disconnected', () => {
      if (this.isIntentionalDisconnect) {
        return;
      }
      this.attemptReconnect();
    });
  }

  protected abstract performReconnect(): Promise<void>;

  protected async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= MAX_RETRIES) {
      console.error('Max reconnect attempts reached. Giving up reconnecting');
      return;
    }
    if (!this.wsEndpoint) {
      console.error('No wsEndpoint found. Cannot reconnect');
      return;
    }

    const delay = INITIAL_BACKOFF * this.reconnectAttempts;
    await new Promise((resolve) => setTimeout(resolve, delay));
    this.reconnectAttempts++;

    try {
      await this.performReconnect();
      this.reconnectAttempts = 0;
    } catch (error) {
      if (this.reconnectAttempts < MAX_RETRIES) {
        this.attemptReconnect();
      } else {
        console.error('Failed to reconnect after max retries:', error);
      }
    }
  }

  // #endregion
}