import { connect } from 'puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js';
import type { Browser } from 'puppeteer-core';
import { Tabs } from './tabs';

/**
 * https://pptr.dev/guides/running-puppeteer-in-the-browser
 */

export class CanvasBrowser {
  #element: HTMLCanvasElement;
  #wsEndpoint: string;
  #pptrBrowser: Browser;
  #tabs: Tabs;

  static async create(
    element: HTMLCanvasElement,
    options: {
      wsEndpoint: string;
    },
  ): Promise<CanvasBrowser> {
    const pptrBrowser = (await connect({
      browserWSEndpoint: options.wsEndpoint,
      defaultViewport: {
        width: 900,
        height: 900,
      }
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
    options: {
      wsEndpoint: string;
    },
  ) {
    this.#element = element;
    this.#pptrBrowser = pptrBrowser;
    this.#wsEndpoint = options.wsEndpoint;
    this.#tabs = new Tabs(pptrBrowser, element);
  }

  get tabs(): Tabs {
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
