import type {
  PuppeteerLifeCycleEvent,
  Protocol,
  Page,
  Dialog,
  Frame,
} from 'puppeteer-core';
import { EventEmitter } from 'eventemitter3';
import { ScreencastRenderer } from './screencast-renderer';

export class Tab extends EventEmitter {
  #id: string;
  #status: 'active' | 'inactive';

  #page: Page;
  #renderer: ScreencastRenderer;

  #favicon = '';
  #url = 'about:blank';
  #dialog: Dialog | null = null;

  #isLoading = false;
  #reloadAbortController: AbortController | null = null;

  constructor(page: Page, canvas: HTMLCanvasElement) {
    super();
    this.#id = Math.random().toString(36).substring(2, 15);
    this.#page = page;
    this.#status = 'active';

    this.#renderer = new ScreencastRenderer(this.#id, page, canvas);

    // page events: https://pptr.dev/api/puppeteer.pageevent
    this.#page.on('dialog', (dialog: Dialog) => this.onDialog(dialog));
    this.#page.on('framenavigated', (frame) => this.onFrameNavigated(frame));
  }

  getTabId() {
    return this.#id;
  }

  getUrl() {
    this.#url = this.#page.url();
    return this.#url;
  }

  async getTitle() {
    const title = await this.#page.title();
    return title;
  }

  async getFavicon(): Promise<string | null> {
    if (this.#favicon) {
      return this.#favicon;
    }

    try {
      const favicon = await this.#page.evaluate(() => {
        const iconLink = document.querySelector(
          'link[rel*="icon"]',
        ) as HTMLLinkElement;
        if (iconLink && iconLink.href) {
          return iconLink.href;
        }

        // fallback
        return `${window.location.origin}/favicon.ico`;
      });

      this.#favicon = favicon;
    } catch (error) {
      console.warn('Failed to get favicon:', error);
    }

    return this.#favicon;
  }

  async active() {
    await this.#page.bringToFront();
    this.#status = 'active';

    // TODO: 需要加入 evaluate 代码确保页面真的可见

    this.#renderer.start();
  }

  async inactive() {
    this.#status = 'inactive';
    this.#renderer.stop();
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

  async reload(): Promise<void> {
    if (this.#reloadAbortController) {
      this.#reloadAbortController.abort();
    }

    this.#reloadAbortController = new AbortController();
    this.#setLoading(true);

    try {
      await this.#page.reload({
        waitUntil: ['load'],
        signal: this.#reloadAbortController.signal,
      });
      this.#setLoading(false);
    } catch (error) {
      this.#setLoading(false);
    } finally {
      this.#reloadAbortController = null;
    }
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

  async goto(
    url: string,
    options?: { waitUntil?: PuppeteerLifeCycleEvent[] },
  ): Promise<void> {
    if (this.#dialog) {
      throw new Error('Cannot navigate while dialog is open');
    }

    this.#setLoading(true);

    try {
      await this.#page.setViewport({
        width: 1280,
        height: 720,
      });
      await this.#page.goto(url, {
        waitUntil: options?.waitUntil || ['load'],
      });

      this.#url = url;
      this.#favicon = ''; // 重置 favicon，让下次获取时重新加载

      this.#setLoading(false);
    } catch (error) {
      this.#setLoading(false);
      throw error;
    }
  }

  #setLoading(loading: boolean) {
    if (this.#isLoading === loading) {
      return;
    }

    this.#isLoading = loading;
    this.emit('loadingStateChanged', {
      isLoading: loading,
      tabId: this.#id,
    });
  }

  private async onFrameNavigated(frame: Frame) {
    if (!frame.parentFrame()) {
      const oldUrl = this.#url;
      const newUrl = frame.url();

      this.#url = newUrl;
      this.getUrl();
      await this.getFavicon();
      await this.getTitle();

      if (oldUrl !== newUrl) {
        this.emit('urlChanged', {
          tabId: this.#id,
          oldUrl,
          newUrl,
        });
      }
    }
  }

  getRenderer(): ScreencastRenderer {
    return this.#renderer;
  }
}
