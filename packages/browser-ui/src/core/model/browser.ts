/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { connect } from 'puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js';
import { getEnvInfo, BaseBrowser } from '@agent-infra/browser/web';
import { UITabs } from './tabs';

import type { Browser, ConnectOptions } from 'puppeteer-core';

/**
 * https://pptr.dev/guides/running-puppeteer-in-the-browser
 */
export class UIBrowser extends BaseBrowser<UITabs> {
  private element: HTMLCanvasElement;

  static async create(
    element: HTMLCanvasElement,
    options: ConnectOptions,
  ): Promise<UIBrowser> {
    const uiBrowser = new UIBrowser(element);
    await uiBrowser.#init(options);

    return uiBrowser;
  }

  constructor(element: HTMLCanvasElement) {
    super();
    this.element = element;
  }

  async disconnect(): Promise<void> {
    this.isIntentionalDisconnect = true;

    document.removeEventListener(
      'visibilitychange',
      this.#handleVisibilityChange,
    );
    await super.disconnect();
  }

  async #init(options: ConnectOptions) {
    const processedOptions = this.#processOptions(options);

    await this.#connect(processedOptions);
  }

  #processOptions(options: ConnectOptions): ConnectOptions {
    const processedOptions = { ...options };

    // 1.Validate browser type
    if (processedOptions.protocol === 'webDriverBiDi') {
      throw new Error(
        'Firefox is not supported. This package is based on CDP (Chrome DevTools Protocol).',
      );
    }

    // 2.Validate endpoint
    if (!processedOptions.browserWSEndpoint && !processedOptions.browserURL) {
      throw new Error(
        'browserWSEndpoint or browserURL is required for connecting.',
      );
    }

    // 3.Set default viewport
    processedOptions.defaultViewport = this.setDefaultViewport(
      options.defaultViewport,
    );

    return processedOptions;
  }

  async #connect(options: ConnectOptions): Promise<void> {
    // @ts-ignore
    this.pptrBrowser = (await connect(options)) as unknown as Browser;

    if (!this.pptrBrowser) {
      throw new Error('Failed to connect to Puppeteer browser');
    }

    this.wsEndpoint = this.pptrBrowser.wsEndpoint();
    this._envInfo = await getEnvInfo(this.pptrBrowser);
    this._tabs = await UITabs.UICreate(this.pptrBrowser, this.element, {
      viewport: options.defaultViewport!,
      envInfo: this._envInfo,
    });

    this.setupAutoReconnect();
    this.#setupVisibilityHandler();
  }

  #setupVisibilityHandler(): void {
    document.addEventListener('visibilitychange', this.#handleVisibilityChange);
  }

  #handleVisibilityChange = (): void => {
    if (
      document.visibilityState === 'visible' &&
      !this.isIntentionalDisconnect
    ) {
      if (!this.pptrBrowser?.connected) {
        this.attemptReconnect();
      }
    }
  };

  protected async performReconnect(): Promise<void> {
    const connectOptions = {
      browserWSEndpoint: this.wsEndpoint,
      defaultViewport: this.defaultViewport,
    };
    this.pptrBrowser = (await connect(connectOptions)) as unknown as Browser;

    this.wsEndpoint = this.pptrBrowser.wsEndpoint();
    this._tabs = await UITabs.UICreate(this.pptrBrowser, this.element, {
      viewport: this.defaultViewport,
      envInfo: this._envInfo!,
    });

    // Restore active tab's ScreencastRenderer after reconnection
    const activeTab = this.tabs.getActiveTab();
    if (activeTab) {
      await activeTab.active();
    }
  }
}
