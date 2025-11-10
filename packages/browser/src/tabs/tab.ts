/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import delay from 'delay';
import { EventEmitter } from 'eventemitter3';
import { BinaryImageParser, Base64ImageParser } from '@agent-infra/media-utils';
import { disableWebdriver, visibilityScript } from '../injected-script';
import { iife, Mutex, validateNavigationUrl } from '../utils';
import { TabDialog } from './dialog';
import { Mouse, Keyboard } from '../actions';

import type { Page, Frame, CDPSession } from 'puppeteer-core';
import {
  TabEvents,
  type NavigationOptions,
  type NavigationResult,
  type TabEventsMap,
  type TabOptions,
  type TabScreenshotOptions,
  type TabScreenshotResult,
} from '../types';

export class Tab extends EventEmitter<TabEventsMap> {
  #id: string;
  #options: TabOptions;
  // eslint-disable-next-line no-unused-private-class-members
  #status: 'active' | 'inactive';

  #pptrPage: Page;

  #url = 'about:blank';
  #favicon = '';
  #title = '';

  #tabDialog: TabDialog;
  #keyboard: Keyboard;
  #mouse: Mouse;

  #isLoading = false;
  #reloadAbortController: AbortController | null = null;

  #scriptsOnCreate: string[] = [disableWebdriver];
  #scriptsOnLoad: string[] = [];

  constructor(page: Page, options: TabOptions) {
    super();
    this.#pptrPage = page;
    this.#options = options;

    // CdpTarget has _targetId
    // @ts-ignore
    this.#id = options.tabId || page.target()._targetId; // tabId is tagetId
    this.#url = page.url();

    this.#status = 'active';
    this.#tabDialog = new TabDialog(this);
    this.#keyboard = new Keyboard(page, this.#tabDialog, options.envInfo);
    this.#mouse = new Mouse(page, this.#tabDialog);

    // page events: https://pptr.dev/api/puppeteer.pageevent
    this.#pptrPage.on('domcontentloaded', this.#dclHandler);
    this.#pptrPage.on('load', this.#loadHandler);
    this.#pptrPage.on('framenavigated', this.#frameNavigatedHandler);
  }

  async init() {
    // Only setup visibility tracking if visibility script is injected
    if (this.#options.injectVisibilityScript) {
      this.#scriptsOnCreate.push(visibilityScript);
      await this.#setupVisibilityTracking();
    }

    await this.#executeScriptsOnCreate();

    if (this.#options.userAgentInfo) {
      await this.#pptrPage.setUserAgent(this.#options.userAgentInfo);
    }
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
    this.#title = await this.#getTitle();

    return this.#title;
  }

  async getFavicon() {
    this.#favicon = await this.#getFavicon();

    return this.#favicon;
  }

  // #endregion

  // #region events handler

  #dclHandler = () => {
    this.emit(TabEvents.TabLoadingStateChanged, {
      isLoading: true,
      tabId: this.#id,
    });
  };

  #loadHandler = () => {
    this.emit(TabEvents.TabLoadingStateChanged, {
      isLoading: false,
      tabId: this.#id,
    });
    this.#executeScriptsOnLoad();
  };

  #frameNavigatedHandler = (frame: Frame) => this.#onFrameNavigated(frame);

  // #endregion

  // #region active status

  /**
   * @internal
   */
  async _active() {
    await this.#pptrPage.bringToFront();
    this.#status = 'active';
  }

  /**
   * @internal
   */
  async _inactive() {
    this.#status = 'inactive';
  }

  /**
   * @internal
   */
  async _checkActiveStatusWithRuntime() {
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

  // #endregion

  // #region dialog/keyboard/mouse

  get dialog() {
    return this.#tabDialog;
  }

  get keyboard() {
    return this.#keyboard;
  }

  get mouse() {
    return this.#mouse;
  }

  // #endregion

  // #region screenshot

  async screenshot<T extends TabScreenshotOptions>(
    options: T = {} as T,
  ): Promise<TabScreenshotResult<T>> {
    if (options.path) {
      const binaryImage = await this.#pptrPage.screenshot({
        path: options.path,
        type: options.type,
        quality: options.quality,
        fullPage: options.fullPage,
      });
      const meta = new BinaryImageParser(binaryImage);

      return {
        data: binaryImage,
        type: meta.getImageType()!,
        width: meta.getDimensions()!.width,
        height: meta.getDimensions()!.height,
      } as TabScreenshotResult<T>;
    }

    const base64Image = await this.#pptrPage.screenshot({
      encoding: 'base64',
      type: options.type,
      quality: options.quality,
      fullPage: options.fullPage,
    });
    const meta = new Base64ImageParser(base64Image);

    return {
      data: base64Image,
      type: meta.getImageType()!,
      width: meta.getDimensions()!.width,
      height: meta.getDimensions()!.height,
    } as TabScreenshotResult<T>;
  }

  // #endregion

  // #region navigation

  async getHistory() {
    // @ts-ignore
    const history = await (this.#pptrPage._client() as CDPSession).send(
      'Page.getNavigationHistory',
    );
    const index = history.currentIndex;
    const length = history.entries.length;

    const canGoBack = length > 1 && index !== 0;
    const canGoForward = length > 1 && index < length - 1;

    return {
      index: index,
      canGoBack: canGoBack,
      canGoForward: canGoForward,
      history: history.entries.map((item) => ({
        url: item.url,
        title: item.title,
      })),
    };
  }

  async goto(
    url: string,
    options: NavigationOptions = {},
  ): Promise<NavigationResult> {
    // validate / normalize url before navigation
    const validated = validateNavigationUrl(url);
    if (validated.ignored) {
      return {
        success: false,
        url: validated.url,
        message: validated.message!,
      };
    }

    this.#setLoading(true);

    try {
      await this.#pptrPage.setViewport({
        width: this.#options.viewport.width,
        height: this.#options.viewport.height,
        deviceScaleFactor: this.#options.viewport.deviceScaleFactor,
      });
      await this.#pptrPage.goto(validated.url, {
        waitUntil: options.waitUntil,
        timeout: options.timeout,
      });

      return {
        success: true,
        url: validated.url,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
        url: validated.url,
      };
    } finally {
      this.#setLoading(false);
    }
  }

  #backMutex = new Mutex();
  async goBack(options: NavigationOptions = {}): Promise<NavigationResult> {
    using _ = await this.#backMutex.acquire();

    try {
      const { canGoBack } = await this.getHistory();

      if (!canGoBack) {
        return {
          success: false,
          url: this.#url,
          message: 'Cannot go back - no previous history entry',
        };
      }

      await this.#pptrPage.goBack({
        waitUntil: options.waitUntil,
        timeout: options.timeout,
      });

      return {
        success: true,
        url: this.#url,
      };
    } catch (error) {
      return {
        success: false,
        url: this.#url,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  #forwardMutex = new Mutex();
  async goForward(options: NavigationOptions = {}): Promise<NavigationResult> {
    using _ = await this.#forwardMutex.acquire();

    try {
      const { canGoForward } = await this.getHistory();

      if (!canGoForward) {
        return {
          success: false,
          url: this.#url,
          message: 'Cannot go forward - no next history entry',
        };
      }

      await this.#pptrPage.goForward({
        waitUntil: options.waitUntil,
        timeout: options.timeout,
      });

      return {
        success: true,
        url: this.#url,
      };
    } catch (error) {
      return {
        success: false,
        url: this.#url,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  #reloadMutex = new Mutex();
  async reload(options: NavigationOptions = {}): Promise<NavigationResult> {
    using _ = await this.#reloadMutex.acquire();

    if (this.#reloadAbortController) {
      this.#reloadAbortController.abort();
    }

    this.#reloadAbortController = new AbortController();
    this.#setLoading(true);

    try {
      await this.#pptrPage.reload({
        waitUntil: options.waitUntil,
        timeout: options.timeout,
        signal: this.#reloadAbortController.signal,
      });
      this.#setLoading(false);

      return {
        success: true,
        url: this.#url,
      };
    } catch (error) {
      this.#setLoading(false);

      return {
        success: false,
        url: this.#url,
        message: error instanceof Error ? error.message : String(error),
      };
    } finally {
      this.#reloadAbortController = null;
    }
  }

  /**
   * @internal
   */
  async _close() {
    this.#pptrPage.off('load', this.#loadHandler);
    this.#pptrPage.off('framenavigated', this.#frameNavigatedHandler);

    if (this.#reloadAbortController) {
      this.#reloadAbortController.abort();
      this.#reloadAbortController = null;
    }

    this.#tabDialog.cleanup();

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

  async #onFrameNavigated(frame: Frame) {
    if (!frame.parentFrame()) {
      const oldUrl = this.#url;
      const newUrl = frame.url();

      this.#url = newUrl;

      if (oldUrl !== newUrl) {
        this.emit(TabEvents.TabUrlChanged, {
          tabId: this.#id,
          oldUrl: oldUrl,
          newUrl: newUrl,
        });
      }
    }
  }

  // #endregion

  // #region injectScript

  injectScriptOnCreate(script: string | string[]) {
    if (Array.isArray(script)) {
      this.#scriptsOnCreate.push(...script);
    } else {
      this.#scriptsOnCreate.push(script);
    }
  }

  injectScriptOnLoad(script: string | string[]) {
    if (Array.isArray(script)) {
      this.#scriptsOnLoad.push(...script);
    } else {
      this.#scriptsOnLoad.push(script);
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
  }

  async #executeScriptsOnCreate() {
    try {
      const script = iife(this.#scriptsOnCreate.join('\n'));
      await Promise.race([
        this.#pptrPage.evaluateOnNewDocument(script),
        this.#pptrPage.evaluate(script),
      ]);
    } catch (error) {
      console.warn('Failed to execute script on create:', error);
    }
  }

  async #executeScriptsOnLoad(): Promise<void> {
    try {
      const script = iife(this.#scriptsOnLoad.join('\n'));
      await this.#pptrPage.evaluate(script);
    } catch (error) {
      console.warn('Failed to execute script on load:', error);
    }
  }

  // #endregion

  // #region private methods

  async #getTitle() {
    try {
      await delay(100);
      const pptrTitle = (await this.#pptrPage.title()).trim();
      if (pptrTitle) {
        return pptrTitle;
      }

      const domTitle = await this.#pptrPage.evaluate(() => {
        const titleElement = document.querySelector('title');
        return titleElement?.textContent?.trim() || '';
      });
      if (domTitle) {
        return domTitle;
      }

      return this.#url;
    } catch (error) {
      return '';
    }
  }

  async #getFavicon() {
    if (this.url === 'about:blank' || this.url.startsWith('chrome://')) {
      return '';
    }

    try {
      await delay(100);
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
}
