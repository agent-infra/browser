// /packages/browser-ui/src/core/browser.ts
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { connect } from 'puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js';
import { UITabs } from './tabs';

import type { Browser, Viewport, ConnectOptions } from 'puppeteer-core';

const MAX_RETRIES = 5;
const INITIAL_BACKOFF = 2000;

/**
 * https://pptr.dev/guides/running-puppeteer-in-the-browser
 */
export class UIBrowser {
  #element: HTMLCanvasElement;
  #wsEndpoint?: string;
  #pptrBrowser?: Browser;
  #tabs?: UITabs;
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

  static async create(
    element: HTMLCanvasElement,
    options: ConnectOptions,
  ): Promise<UIBrowser> {
    const uiBrowser = new UIBrowser(element);
    await uiBrowser.#init(options);

    return uiBrowser;
  }

  private constructor(element: HTMLCanvasElement) {
    this.#element = element;
  }

  get tabs(): UITabs {
    return this.#tabs!;
  }

  async disconnect(): Promise<void> {
    this.#isIntentionalDisconnect = true;

    document.removeEventListener(
      'visibilitychange',
      this.#handleVisibilityChange,
    );
    await this.#tabs?.destroy();
    await this.#pptrBrowser?.disconnect();
  }

  async #init(options: ConnectOptions) {
    const processedOptions = this.#processOptions(options);

    await this.#connect(processedOptions);
  }

  #processOptions(options: ConnectOptions): ConnectOptions {
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
    processedOptions.defaultViewport = setDefaultViewport(
      options.defaultViewport,
    );

    return processedOptions;
  }

  async #connect(options: ConnectOptions): Promise<void> {
    // @ts-ignore
    this.#pptrBrowser = (await connect(options)) as unknown as Browser;

    if (!this.#pptrBrowser) {
      throw new Error('Failed to connect to Puppeteer browser');
    }

    this.#wsEndpoint = this.#pptrBrowser.wsEndpoint();
    this.#tabs = new UITabs(this.#pptrBrowser, this.#element, {
      viewport: options.defaultViewport!,
    });

    this.#setupAutoReconnect();
  }

  #setupAutoReconnect(): void {
    // Listen for browser disconnection
    this.#pptrBrowser!.on('disconnected', () => {
      // console.log('pptrBrowser disconnected');

      if (this.#isIntentionalDisconnect) {
        return;
      }
      this.#attemptReconnect();
    });
    document.addEventListener('visibilitychange', this.#handleVisibilityChange);
  }

  #handleVisibilityChange = (): void => {
    if (
      document.visibilityState === 'visible' &&
      !this.#isIntentionalDisconnect
    ) {
      // console.log(
      //   'handleVisibilityChange',
      //   !!this.#pptrBrowser,
      //   !!this.#pptrBrowser?.connected,
      // );
      if (!this.#pptrBrowser?.connected) {
        this.#attemptReconnect();
      }
    }
  };

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
      this.#pptrBrowser = (await connect({
        browserWSEndpoint: this.#wsEndpoint,
        defaultViewport: this.#defaultViewport,
      })) as unknown as Browser;

      this.#wsEndpoint = this.#pptrBrowser.wsEndpoint();
      this.#tabs = new UITabs(this.#pptrBrowser, this.#element, {
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
}
