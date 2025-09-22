/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { connect } from 'puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js';
import { UITabs } from './tabs';

import type { Browser } from 'puppeteer-core';
import type { BrowserOptions } from '@agent-infra/puppeteer-enhance';

/**
 * https://pptr.dev/guides/running-puppeteer-in-the-browser
 */

export class CanvasBrowser {
  #element: HTMLCanvasElement;
  #wsEndpoint: string;
  #pptrBrowser: Browser;
  #tabs: UITabs;

  static async create(
    element: HTMLCanvasElement,
    options: BrowserOptions,
  ): Promise<CanvasBrowser> {
    const pptrBrowser = (await connect({
      browserWSEndpoint: options.wsEndpoint,
      defaultViewport: {
        width: options.viewport.width,
        height: options.viewport.height,
        deviceScaleFactor: 0, // Setting this value to 0 will reset this value to the system default.
      },
    })) as unknown as Browser;

    if (!pptrBrowser) {
      throw new Error('Failed to connect to Puppeteer browser');
    }

    const version = await pptrBrowser.version();
    console.log(`Connected to Puppeteer browser version: ${version}`);

    return new CanvasBrowser(element, pptrBrowser, options);
  }

  private constructor(
    element: HTMLCanvasElement,
    pptrBrowser: Browser,
    options: BrowserOptions,
  ) {
    this.#element = element;
    this.#pptrBrowser = pptrBrowser;
    this.#wsEndpoint = options.wsEndpoint;
    this.#tabs = new UITabs(pptrBrowser, element, {
      viewport: options.viewport,
    });
  }

  get tabs(): UITabs {
    return this.#tabs;
  }

  async destroy() {
    if (this.#tabs) {
      await this.#tabs.destroy();
    }
    if (this.#pptrBrowser) {
      await this.#pptrBrowser.disconnect();
    }
  }
}
