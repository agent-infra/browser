import type { PuppeteerLifeCycleEvent, Protocol, Page, Dialog } from "puppeteer-core";
import { EventEmitter } from "events";

export class Tab extends EventEmitter {
  #id: string;
  #status: 'active' | 'inactive';
  #page: Page;
  #dialog: Dialog | null = null;

  constructor(page: Page) {
    super();
    this.#id = Math.random().toString(36).substring(2, 15);
    this.#page = page;
    this.#status = 'active';

    // 对于一个 new Page 的空白页面，url 为空字符串，title 为 "about:blank"

    // page events: https://pptr.dev/api/puppeteer.pageevent
    this.#page.on('dialog', (dialog: Dialog) => this.onDialog(dialog));
  }

  getTabId() {
    return this.#id;
  }

  getUrl() {
    return this.#page.url();
  }

  async getTitle() {
    const title = await this.#page.title();
    return title;
  }

  async getFavicon(): Promise<string | null> {
    try {
      const favicon = await this.#page.evaluate(() => {
        // 尝试获取 link[rel*="icon"] 元素
        const iconLink = document.querySelector(
          'link[rel*="icon"]',
        ) as HTMLLinkElement;
        if (iconLink && iconLink.href) {
          return iconLink.href;
        }

        // fallback 到默认的 /favicon.ico
        return `${window.location.origin}/favicon.ico`;
      });

      return favicon;
    } catch (error) {
      console.warn('Failed to get favicon:', error);
      return null;
    }
  }

  async active() {
    await this.#page.bringToFront();
    this.#status = 'active';

    // TODO: 需要加入 evaluate 代码确保页面真的可见
  }

  async goBack(waitUntil: PuppeteerLifeCycleEvent[] = []): Promise<boolean> {
    if (this.#dialog) {
      return false;
    }

    await this.#page.goBack({ waitUntil: waitUntil });
    return true;
  }

  async goForward(waitUntil: PuppeteerLifeCycleEvent[] = []): Promise<boolean> {
    if (this.#dialog) {
      return false;
    }

    await this.#page.goForward({ waitUntil: waitUntil });
    return true;
  }

  async reload(waitUntil: PuppeteerLifeCycleEvent[] = []): Promise<void> {
    await this.#page.reload({ waitUntil: waitUntil });
  }

  async close() {
    await this.#page.close();
  }

  async onDialog(dialog: Dialog) {
    this.#dialog = dialog;

    this.emit('dialog', {
      type: dialog.type,
      message: dialog.message,
      defaultValue: dialog.defaultValue,
      accept: async (promptText?: string) => {
        await dialog.accept(promptText);
        this.#dialog = null;
      },
      dismiss: async () => {
        await dialog.dismiss();
        this.#dialog = null;
      },
    });
  }
}