/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { launch, connect } from 'puppeteer-core';
import { BrowserFinder } from '@agent-infra/browser-finder';
import { Tabs } from '../tabs/tabs';
import { getEnvInfo } from '../env';
import { BaseBrowser } from './base';

import type { Cookie, CookieData, DeleteCookiesRequest, LaunchOptions } from 'puppeteer-core';

export class Browser extends BaseBrowser<Tabs> {
  /**
   * Create a browser instance (launch or connect based on options)
   */
  static async create(options: LaunchOptions = {}): Promise<Browser> {
    const browser = new Browser();
    await browser.#init(options);
    return browser;
  }

  constructor() {
    super();
  }

  // #region cookies

  /**
   * cookies API
   *
   * @doc: https://pptr.dev/guides/cookies#setting-cookies
   */

  cookies() {
    return this.pptrBrowser!.cookies();
  }

  setCookie(...cookies: CookieData[]) {
    return this.pptrBrowser!.setCookie(...cookies);
  }

  deleteCookie(...cookies: Cookie[]) {
    return this.pptrBrowser!.deleteCookie(...cookies);
  }

  deleteMatchingCookies(...filters: DeleteCookiesRequest[]) {
    return this.pptrBrowser!.deleteMatchingCookies(...filters);
  }

  // #endregion

  // #region lifecycle

  async close() {
    this.isIntentionalDisconnect = true;

    await this.destroyAllTabs();
    await this.pptrBrowser?.close();
  }

  // #endregion

  // #region launch & connect

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
      // https://github.com/GoogleChrome/chrome-launcher/blob/main/docs/chrome-flags-for-tools.md
      const defaultArgs = [
        '--mute-audio', // Mute any audio
        '--no-default-browser-check', // Disable the default browser check, do not prompt to set it as such
        '--ash-no-nudges', // Avoids blue bubble "user education" nudges
      ];
      // window-size includes some Chrome UI components (such as tabs, URL input box, etc.),
      // so an additional 90 pixels should be added to the viewport height.
      const windowSizeArg = `--window-size=${this.defaultViewport.width},${this.defaultViewport.height + 90}`;

      // args
      for (const arg of defaultArgs) {
        if (!args.includes(arg)) {
          args.push(arg);
        }
      }
      if (!args.find((arg) => arg.startsWith('--window-size'))) {
        args.push(windowSizeArg);
      }

      processedOptions.args = args;

      // ignoreArgs
      const enableAutomationArg = '--enable-automation';
      if (processedOptions.ignoreDefaultArgs) {
        if (Array.isArray(processedOptions.ignoreDefaultArgs)) {
          const ignoreArgs = processedOptions.ignoreDefaultArgs;
          if (!ignoreArgs.includes(enableAutomationArg)) {
            ignoreArgs.push(enableAutomationArg);
          }
        }
      } else {
        processedOptions.ignoreDefaultArgs = [enableAutomationArg];
      }
    };

    // 1.Set default viewport
    processedOptions.defaultViewport = this.setDefaultViewport(
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

  #isConnectMode(options: LaunchOptions): boolean {
    return !!(options.browserWSEndpoint || options.browserURL);
  }

  async #launch(options: LaunchOptions): Promise<void> {
    this.pptrBrowser = await launch(options);

    if (!this.pptrBrowser) {
      throw new Error('Puppeteer browser not launch');
    }

    this.wsEndpoint = this.pptrBrowser.wsEndpoint();

    this._envInfo = await getEnvInfo(this.pptrBrowser);
    this._tabs = await Tabs.create(this.pptrBrowser, {
      viewport: this.defaultViewport,
      envInfo: this._envInfo,
      userAgentInfo: this.userAgentInfo,
    });
    this.setupAutoReconnect();
  }

  async #connect(options: LaunchOptions): Promise<void> {
    this.pptrBrowser = await connect(options);

    if (!this.pptrBrowser) {
      throw new Error('Puppeteer browser not connect');
    }

    this.wsEndpoint = this.pptrBrowser.wsEndpoint();

    this._envInfo = await getEnvInfo(this.pptrBrowser);
    this._tabs = await Tabs.create(this.pptrBrowser, {
      viewport: this.defaultViewport,
      envInfo: this._envInfo,
      userAgentInfo: this.userAgentInfo,
    });
    this.setupAutoReconnect();
  }

  override async performReconnect(): Promise<void> {
    const connectOptions = {
      browserWSEndpoint: this.wsEndpoint,
      defaultViewport: this.defaultViewport,
    };
    this.pptrBrowser = await connect(connectOptions);

    this.wsEndpoint = this.pptrBrowser.wsEndpoint();
    this._tabs = await Tabs.create(this.pptrBrowser, {
      viewport: this.defaultViewport,
      envInfo: this._envInfo!,
    });

    const activeTab = this.getActiveTab();
    if (activeTab) {
      await activeTab.active();
    }
  }

  // #endregion
}
