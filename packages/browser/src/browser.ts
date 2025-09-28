/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { launch, connect } from 'puppeteer-core';
import { BrowserFinder } from '@agent-infra/browser-finder';
import { Tabs } from './tabs/tabs';
import { getEnvInfo } from './env';

import type {
  Browser as pptrBrowser,
  LaunchOptions,
  ConnectOptions,
  Viewport,
} from 'puppeteer-core';

const MAX_RETRIES = 5;
const INITIAL_BACKOFF = 2000;

export class Browser {
  #pptrBrowser?: pptrBrowser;
  #tabs?: Tabs;

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

  #isIntentionalDisconnect: boolean = false;
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

  // #region public methods

  get tabs(): Tabs {
    return this.#tabs!;
  }

  async getBrowserMetaInfo() {
    if (!this.#pptrBrowser) {
      throw new Error('Browser not initialized');
    }

    const [envInfo, userAgent] = await Promise.all([
      getEnvInfo(this.#pptrBrowser),
      this.#pptrBrowser.userAgent(),
    ]);

    return {
      ...envInfo,
      userAgent,
      viewport: this.#defaultViewport,
      wsEndpoint: this.#wsEndpoint,
    };
  }

  async disconnect(): Promise<void> {
    this.#isIntentionalDisconnect = true;

    await this.#pptrBrowser?.disconnect();
  }

  // #endregion

  // #region private methods

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
    const setArgs = () => {
      const args = processedOptions.args || [];
      const defaultArgs = ['--mute-audio', '--no-default-browser-check'];
      const windowSizeArg = `--window-size=${this.#defaultViewport.width},${this.#defaultViewport.height + 90}`;

      // args
      for (const arg of defaultArgs) {
        if (!args.includes(arg)) {
          args.push(arg);
        }
      }
      if (args.find((arg) => arg.startsWith('--window-size'))) {
        args.push(windowSizeArg);
      }

      processedOptions.args = args;

      // ignoreArgs
      if (processedOptions.ignoreDefaultArgs) {
        if (Array.isArray(processedOptions.ignoreDefaultArgs)) {
          const ignoreArgs = processedOptions.ignoreDefaultArgs;
          const enableAutomationArg = '--enable-automation';
          if (!ignoreArgs.includes(enableAutomationArg)) {
            ignoreArgs.push(enableAutomationArg);
          }
        }
      } else {
        processedOptions.ignoreDefaultArgs = ['--enable-automation'];
      }
    }

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

    if (
      !this.#isConnectMode(processedOptions) &&
      !processedOptions.executablePath
    ) {
      // 3.Set executable path if needed
      processedOptions.executablePath = findBrowserPath();

      // 4.Optimize args and ignoreDefaultArgs for launch mode
      setArgs();
    }


    return processedOptions;
  }

  async #launch(options: LaunchOptions): Promise<void> {
    this.#pptrBrowser = await launch(options);

    if (!this.#pptrBrowser) {
      throw new Error('Puppeteer browser not launch');
    }

    this.#wsEndpoint = this.#pptrBrowser.wsEndpoint();
    this.#tabs = new Tabs(this.#pptrBrowser, {
      viewport: this.#defaultViewport,
    });
    this.#setupAutoReconnect();
  }

  async #connect(options: LaunchOptions): Promise<void> {
    this.#pptrBrowser = await connect(options);

    if (!this.#pptrBrowser) {
      throw new Error('Puppeteer browser not connect');
    }

    this.#wsEndpoint = this.#pptrBrowser.wsEndpoint();
    this.#tabs = new Tabs(this.#pptrBrowser, {
      viewport: this.#defaultViewport,
    });
    this.#setupAutoReconnect();
  }

  #isConnectMode(options: LaunchOptions): boolean {
    return !!(options.browserWSEndpoint || options.browserURL);
  }

  #setupAutoReconnect(): void {
    this.#pptrBrowser!.on('disconnected', () => {
      if (this.#isIntentionalDisconnect) {
        return;
      }

      this.#attemptReconnect();
    });
  }

  async #attemptReconnect(): Promise<void> {
    if (this.#reconnectAttempts >= MAX_RETRIES) {
      console.error('Max reconnect attempts reached. Giving up reconnecting');
      return;
    }
    if (!this.#wsEndpoint) {
      console.error('No wsEndpoint found. Cannot reconnect');
      return;
    }

    const delay = INITIAL_BACKOFF * this.#reconnectAttempts;
    this.#reconnectAttempts++;
    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      const connectOptions: ConnectOptions = {
        browserWSEndpoint: this.#wsEndpoint,
        defaultViewport: this.#defaultViewport,
      };
      this.#pptrBrowser = await connect(connectOptions);

      this.#wsEndpoint = this.#pptrBrowser.wsEndpoint();
      this.#tabs = new Tabs(this.#pptrBrowser, {
        viewport: this.#defaultViewport,
      });
      this.#reconnectAttempts = 0;
    } catch (error) {
      if (this.#reconnectAttempts < MAX_RETRIES) {
        this.#attemptReconnect();
      } else {
        console.error('Failed to reconnect after max retries:', error);
      }
    }
  }

  // #endregion
}
