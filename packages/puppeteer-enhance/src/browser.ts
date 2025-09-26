/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { launch, connect } from 'puppeteer-core';
import { BrowserFinder } from '@agent-infra/browser-finder';

import type {
  Browser as PuppeteerBrowser,
  LaunchOptions,
  ConnectOptions,
  Viewport,
} from 'puppeteer-core';

export interface ReconnectOptions {
  enabled?: boolean;
  maxRetries?: number;
  retryInterval?: number;
  backoffMultiplier?: number;
}

export class Browser {
  #pptrBrowser: PuppeteerBrowser | null = null;

  #wsEndpoint = '';
  // https://pptr.dev/api/puppeteer.viewport
  #defaultViewport: Viewport = {
    // pptr default width and height are 800 x 600,
    // but nowadays there are basically no such devices.
    // 1280 x 1024 is AIO sandbox default size.
    width: 1280,
    height: 1024,
    // Setting deviceScaleFactor value to 0 will reset this value to the system default.
    deviceScaleFactor: 0,
    isMobile: false, // deafault is false in pptr
    isLandscape: false, // deafault is false in pptr
    hasTouch: false, // deafault is false in pptr
  };

  #isConnected: boolean = false;
  #isDestroyed: boolean = false;
  #reconnectAttempts: number = 0;

  /**
   * Create a browser instance (launch or connect based on options)
   */
  static async create(options: LaunchOptions = {}): Promise<Browser> {
    const browser = new Browser();
    await browser.#init(options);
    return browser;
  }

  constructor() {}

  async #init(options: LaunchOptions): Promise<void> {
    const processedOptions = this.#processOptions(options);

    if (this.#isConnectMode(processedOptions)) {
      await this.#connect(processedOptions);
    } else {
      await this.#launch(processedOptions);
    }
  }

  #processOptions(options: LaunchOptions): LaunchOptions {
    const processedOptions = { ...options };
    const setDefaultViewport = (viewport?: Viewport | null) => {
      if (!viewport) {
        return this.#defaultViewport;
      }

      if (typeof viewport === 'object') {
        this.#defaultViewport = {
          ...this.#defaultViewport,
          ...viewport,
        };
      }

      return this.#defaultViewport;
    };
    const findBrowserPath = () => {
      const finder = new BrowserFinder();
      const browsers = ['chrome', 'edge'] as const;

      const foundBrowser = browsers.find((browser) => {
        try {
          finder.findBrowser(browser);
          return true;
        } catch {
          return false;
        }
      });

      if (!foundBrowser) {
        throw new Error(
          'No Chrome or Edge browser found. Please install Chrome or Edge browser first.',
        );
      }

      return finder.findBrowser(foundBrowser).path;
    };

    // 1.Set default viewport
    processedOptions.defaultViewport = setDefaultViewport(
      options.defaultViewport,
    );

    // 2.Validate browser type
    if (
      processedOptions.browser === 'firefox' ||
      processedOptions.executablePath?.toLowerCase().includes('firefox') ||
      processedOptions.protocol === 'webDriverBiDi'
    ) {
      throw new Error(
        'Firefox is not supported. This package is based on CDP (Chrome DevTools Protocol).',
      );
    }

    // 3.Set executable path if needed
    if (
      !this.#isConnectMode(processedOptions) &&
      !processedOptions.executablePath
    ) {
      processedOptions.executablePath = findBrowserPath();
    }

    return processedOptions;
  }

  #isConnectMode(options: LaunchOptions): boolean {
    return !!(options.browserWSEndpoint || options.browserURL);
  }

  async #launch(options: LaunchOptions): Promise<void> {
    this.#pptrBrowser = await launch(options);

    if (!this.#pptrBrowser) {
      throw new Error('pptrBrowser not launch');
    }

    this.#wsEndpoint = this.#pptrBrowser.wsEndpoint();
    this.#isConnected = true;
    this.#setupAutoReconnect();
  }

  async #connect(options: LaunchOptions): Promise<void> {
    this.#pptrBrowser = await connect(options);

    if (!this.#pptrBrowser) {
      throw new Error('pptrBrowser not connect');
    }

    this.#wsEndpoint = this.#pptrBrowser.wsEndpoint();
    this.#isConnected = true;
    this.#setupAutoReconnect();
  }

  #setupAutoReconnect(): void {
    if (!this.#isConnected || !this.#pptrBrowser) return;

    const reconnectConfig = {
      enabled: true,
      maxRetries: 5,
      retryInterval: 2000,
      backoffMultiplier: 1.5,
    };

    if (!reconnectConfig.enabled) return;

    this.#pptrBrowser.on('disconnected', () => {
      if (this.#isDestroyed) return;

      console.log('Browser disconnected, attempting to reconnect...');
      this.#isConnected = false;
      this.#attemptReconnect(reconnectConfig);
    });
  }

  async #attemptReconnect(config: Required<ReconnectOptions>): Promise<void> {
    if (this.#reconnectAttempts >= config.maxRetries) {
      console.error(`Max reconnect attempts (${config.maxRetries}) reached`);
      return;
    }

    this.#reconnectAttempts++;
    const delay =
      config.retryInterval *
      Math.pow(config.backoffMultiplier, this.#reconnectAttempts - 1);

    console.log(
      `Reconnect attempt ${this.#reconnectAttempts}/${config.maxRetries} in ${delay}ms`,
    );

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      // 重连时使用当前的 wsEndpoint
      const connectOptions: ConnectOptions = {
        browserWSEndpoint: this.#wsEndpoint,
      };

      this.#pptrBrowser = await connect(connectOptions);
      this.#isConnected = true;
      this.#reconnectAttempts = 0; // 重置重连次数
      console.log('Successfully reconnected to browser');
    } catch (error) {
      console.error(
        `Reconnect attempt ${this.#reconnectAttempts} failed:`,
        error,
      );

      if (this.#reconnectAttempts < config.maxRetries) {
        this.#attemptReconnect(config);
      }
    }
  }

  async destroy(): Promise<void> {
    this.#isDestroyed = true;
    this.#isConnected = false;

    await this.#pptrBrowser?.disconnect();
  }
}
