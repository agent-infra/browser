import type {
  Page,
  Frame,
  Dialog,
  PuppeteerLifeCycleEvent,
} from 'puppeteer-core';
import { EventEmitter } from 'eventemitter3';
import { ScreencastRenderer } from './screencast-renderer';
import { TabEvents } from '../event/tabs';

interface TabEventMap {
  [TabEvents.TabLoadingStateChanged]: {
    tabId: string;
    isLoading: boolean;
  };
  [TabEvents.TabUrlChanged]: {
    tabId: string;
    oldUrl: string;
    newUrl: string;
  };
}

export class Tab extends EventEmitter<TabEventMap> {
  #id: string;
  #status: 'active' | 'inactive';

  #pptrPage: Page;
  #renderer: ScreencastRenderer;

  #favicon = '';
  #url = 'about:blank';
  #dialog: Dialog | null = null;

  #isLoading = false;
  #reloadAbortController: AbortController | null = null;

  constructor(page: Page, canvas: HTMLCanvasElement) {
    super();
    this.#pptrPage = page;
    // CdpTarget has _targetId
    // @ts-ignore
    this.#id = page.target()._targetId; // tabId is tagetId
    this.#url = page.url();

    this.#status = 'active';

    this.#renderer = new ScreencastRenderer(this.#id, page, canvas);

    // page events: https://pptr.dev/api/puppeteer.pageevent
    this.#pptrPage.on('dialog', (dialog: Dialog) => this.#onDialog(dialog));
  }

  get tabId() {
    return this.#id;
  }

  get page() {
    return this.#pptrPage;
  }

  get url() {
    this.#url = this.#pptrPage.url();

    return this.#url;
  }

  async getTitle() {
    const title = await this.#pptrPage.title();
    return title;
  }

  async getFavicon(): Promise<string | null> {
    if (this.#favicon) {
      return this.#favicon;
    }

    if (this.#url === 'about:blank' || this.#url.startsWith('chrome://')) {
      return '';
    }

    try {
      const favicon = await this.#pptrPage.evaluate(() => {
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
    await this.#pptrPage.bringToFront();
    this.#status = 'active';

    if (this.#url === 'about:blank' || this.#url.startsWith('chrome://')) {
      return;
    }

    this.#renderer.start();
  }

  async inactive() {
    this.#status = 'inactive';

    if (this.#url === 'about:blank' || this.#url.startsWith('chrome://')) {
      return '';
    }

    this.#renderer.stop();
  }

  async checkActiveStatusWithRuntime() {
    try {
      await this.#pptrPage.waitForFunction(
        () => document.visibilityState === 'visible',
        {
          timeout: 1000,
        },
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  async goBack(waitUntil: PuppeteerLifeCycleEvent[] = []): Promise<boolean> {
    if (this.#dialog) {
      return false;
    }

    await this.#pptrPage.goBack({ waitUntil: waitUntil });
    return true;
  }

  async goForward(waitUntil: PuppeteerLifeCycleEvent[] = []): Promise<boolean> {
    if (this.#dialog) {
      return false;
    }

    await this.#pptrPage.goForward({ waitUntil: waitUntil });
    return true;
  }

  async reload(): Promise<void> {
    if (this.#reloadAbortController) {
      this.#reloadAbortController.abort();
    }

    this.#reloadAbortController = new AbortController();
    this.#setLoading(true);

    try {
      await this.#pptrPage.reload({
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
    await this.#pptrPage.close();
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
      await this.#pptrPage.setViewport({
        width: 1280,
        height: 720,
      });
      await this.#pptrPage.goto(url, {
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
    this.emit(TabEvents.TabLoadingStateChanged, {
      isLoading: loading,
      tabId: this.#id,
    });
  }

  async #onDialog(dialog: Dialog) {
    this.#dialog = dialog;

    // this.emit('dialog', {
    //   type: dialog.type,
    //   message: dialog.message,
    //   defaultValue: dialog.defaultValue,
    //   accept: async (promptText?: string) => {
    //     await dialog.accept(promptText);
    //     this.#dialog = null;
    //   },
    //   dismiss: async () => {
    //     await dialog.dismiss();
    //     this.#dialog = null;
    //   },
    // });
  }

  async #onFrameNavigated(frame: Frame) {
    // TODO: 需要考虑一下，如果当前的 主 frame 是其他的网页通过 popup 打开的，
    // 是不是 frame.parentFrame() 不为空，导致这个逻辑判断出问题？
    if (!frame.parentFrame()) {
      const oldUrl = this.#url;
      const newUrl = frame.url();

      this.#url = newUrl;
      await this.getFavicon();
      await this.getTitle();

      if (oldUrl !== newUrl) {
        this.emit(TabEvents.TabUrlChanged, {
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
