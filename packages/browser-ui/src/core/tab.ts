import type {
  Page,
  Frame,
  Dialog,
  PuppeteerLifeCycleEvent,
} from 'puppeteer-core';
import { EventEmitter } from 'eventemitter3';
import { ScreencastRenderer } from './screencast-renderer';
import { TabEvents, TabEventsMap } from '../types/tabs';

declare global {
  interface Window {
    __agent_infra_visibility_initialized?: boolean;
    __agent_infra_visibility_change?: (isVisible: boolean) => void;
  }
}

export class Tab extends EventEmitter<TabEventsMap> {
  #id: string;
  #status: 'active' | 'inactive';

  #pptrPage: Page;
  #renderer: ScreencastRenderer;

  #url = 'about:blank';
  #favicon = '';
  #title = '';

  #dialog: Dialog | null = null;

  #isLoading = false;
  #reloadAbortController: AbortController | null = null;

  constructor(id: string, page: Page, canvas: HTMLCanvasElement) {
    super();
    this.#pptrPage = page;
    // CdpTarget has _targetId
    // @ts-ignore
    this.#id = id || page.target()._targetId; // tabId is tagetId
    this.#url = page.url();

    this.#status = 'active';

    this.#renderer = new ScreencastRenderer(this.#id, page, canvas);

    // 设置页面可见性监听
    this.#setupVisibilityTracking();

    // page events: https://pptr.dev/api/puppeteer.pageevent
    this.#pptrPage.on('dialog', this.#dialogHandler);
    this.#pptrPage.on('domcontentloaded', this.#dclHandler);
    this.#pptrPage.on('load', this.#loadHandler);
    this.#pptrPage.on('framenavigated', this.#frameNavigatedHandler);
  }

  // #region meta info

  get tabId() {
    return this.#id;
  }

  get page() {
    return this.#pptrPage;
  }

  get url() {
    return this.#url;
  }

  async getTitle() {
    if (!this.#title) {
      this.#title = await this.#pptrPage.title();
    }

    return this.#title;
  }

  async getFavicon() {
    if (!this.#favicon) {
      this.#favicon = await this.#getFavicon();
    }

    return this.#favicon;
  }

  // #endregion

  // #region events handler

  #dialogHandler = (dialog: Dialog) => this.#onDialog(dialog);

  #dclHandler = () => {
    this.emit(TabEvents.TabLoadingStateChanged, {
      isLoading: true,
      tabId: this.#id,
    });
  }

  #loadHandler = () => {
    this.emit(TabEvents.TabLoadingStateChanged, {
      isLoading: false,
      tabId: this.#id,
    });
  };

  #frameNavigatedHandler = (frame: Frame) => this.#onFrameNavigated(frame);

  // #endregion

  // #region public methods

  async active() {
    await this.#pptrPage.bringToFront();
    this.#status = 'active';

    this.#renderer.start();
  }

  async inactive() {
    this.#status = 'inactive';

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

  async goto(
    url: string,
    options?: { waitUntil?: PuppeteerLifeCycleEvent[] },
  ): Promise<void> {
    if (this.#dialog) {
      throw new Error('Cannot navigate while dialog is open');
    }

    this.#url = url;
    this.#title = url;

    this.#setLoading(true);

    try {
      // await this.#pptrPage.setViewport({
      //   width: 900,
      //   height: 900,
      // });
      await this.#pptrPage.goto(url, {
        waitUntil: options?.waitUntil || ['load'],
      });

      this.#title = await this.#pptrPage.title();
      this.#favicon = await this.#getFavicon();

      this.#setLoading(false);
    } catch (error) {
      this.#setLoading(false);
      throw error;
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
    this.#pptrPage.off('dialog', this.#dialogHandler);
    this.#pptrPage.off('load', this.#loadHandler);
    this.#pptrPage.off('framenavigated', this.#frameNavigatedHandler);

    if (this.#reloadAbortController) {
      this.#reloadAbortController.abort();
      this.#reloadAbortController = null;
    }

    try {
      await this.#pptrPage.close();
    } catch (error) {
      // If the page has already been manually closed
      // (not controlled by pptr, usually upon receiving the 'targetdestroyed' event),
      // then it can be ignored directly.
      if (
        error instanceof Error &&
        error.message.includes('No target with given id found')
      ) {
        return;
      }

      throw error;
    }
  }

  getRenderer(): ScreencastRenderer {
    return this.#renderer;
  }

  // #endregion

  // #region pravite methods

  async #getFavicon() {
    if (this.url === 'about:blank' || this.url.startsWith('chrome://')) {
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
        if (
          window.location &&
          window.location.origin &&
          window.location.origin !== 'null' &&
          window.location.origin !== 'file://'
        ) {
          return `${window.location.origin}/favicon.ico`;
        }

        return '';
      });

      return favicon;
    } catch (error) {
      console.warn('Failed to get favicon:', error);
      return '';
    }
  }

  #setLoading(loading: boolean) {
    if (this.#isLoading === loading) {
      return;
    }

    // console.log('setLoading', loading, this.#url);

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
    if (!frame.parentFrame()) {
      const oldUrl = this.#url;
      const newUrl = frame.url();

      this.#url = newUrl;
      this.#title = await this.#pptrPage.title();
      this.#favicon = await this.#getFavicon();

      if (oldUrl !== newUrl) {
        // console.log('onFrameNavigated', newUrl, this.#isLoading);

        this.emit(TabEvents.TabUrlChanged, {
          tabId: this.#id,
          oldUrl,
          newUrl,
        });
      }
    }
  }

  async #setupVisibilityTracking() {
    await this.#pptrPage.exposeFunction(
      '__agent_infra_visibility_change',
      (isVisible: boolean) => {
        this.emit(TabEvents.TabVisibilityChanged, {
          tabId: this.#id,
          isVisible,
        });
      },
    );

    const injectedScript = () => {
      if (window.top !== window) {
        return;
      }
      if (window.__agent_infra_visibility_initialized) {
        return;
      }

      console.log('injectedScript');

      const handleVisibilityChange = () => {
        const isVisible = document.visibilityState === 'visible';
        if (typeof window.__agent_infra_visibility_change === 'function') {
          window.__agent_infra_visibility_change(isVisible);
        }
      };

      window.__agent_infra_visibility_initialized = true;

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handleVisibilityChange);
      } else {
        handleVisibilityChange();
      }

      document.addEventListener('visibilitychange', handleVisibilityChange);
    };

    try {
      await this.#pptrPage.evaluateOnNewDocument(injectedScript);
      await this.#pptrPage.evaluate(injectedScript);
    } catch (error) {}
  }

  // #endregion
}