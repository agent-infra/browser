import type { Protocol, Page, Dialog } from "puppeteer-core";
import { EventEmitter } from "events";

export class Tab extends EventEmitter {
  #page: Page;
  #dialogs: Dialog[] = [];

  constructor(page: Page) {
    super();
    this.#page = page;

    // page events: https://pptr.dev/api/puppeteer.pageevent
    this.#page.on('dialog', (dialog: Dialog) => this.onDialog(dialog));
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

  async goBack(): Promise<void> {
    await this.#page.goBack({ waitUntil: [] });
  }

  async goForward(): Promise<void> {
    await this.#page.goForward({ waitUntil: [] });
  }

  async reload(): Promise<void> {
    await this.#page.reload({ waitUntil: [] });
  }

  async close() {
    await this.#page.close();
  }

  getDialogCount() {
    return this.#dialogs.length;
  }

  async onDialog(dialog: Dialog) {
    this.#dialogs.push(dialog);

    this.emit('dialog', {
      type: dialog.type,
      message: dialog.message,
      defaultValue: dialog.defaultValue,
      accept: async (promptText?: string) => {
        await dialog.accept(promptText);
        this.#dialogs.shift();
      },
      dismiss: async () => {
        await dialog.dismiss();
        this.#dialogs.shift();
      },
    });
  }
}