/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { EventEmitter } from 'eventemitter3';
import { disableWebdriver, visibilityScript } from '../injected-script';
import { iife } from '../utils';

import type { Page, Frame, Dialog } from 'puppeteer-core';
import {
  TabEvents,
  type NavigationOptions,
  type TabEventsMap,
  type TabOptions,
} from '../types';


export class Tab extends EventEmitter<TabEventsMap> {
  #id: string;
  #options: TabOptions;
  #status: 'active' | 'inactive';

  #pptrPage: Page;

  #url = 'about:blank';
  #favicon = '';
  #title = '';

  #dialog: Dialog | null = null;

  #isLoading = false;
  #reloadAbortController: AbortController | null = null;

  #scriptsOnCreate: string[] = [disableWebdriver, visibilityScript];
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

    this.#setupVisibilityTracking();
    this.#executeScriptsOnCreate();

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

  // #region public methods

  async active() {
    await this.#pptrPage.bringToFront();
    this.#status = 'active';
  }

  async inactive() {
    this.#status = 'inactive';
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

  async goto(url: string, options: NavigationOptions): Promise<void> {
    if (this.#dialog) {
      throw new Error('Cannot navigate while dialog is open');
    }

    this.#url = url;
    this.#title = url;

    this.#setLoading(true);

    try {
      await this.#pptrPage.setViewport({
        width: this.#options.viewport.width,
        height: this.#options.viewport.height,
      });
      await this.#pptrPage.goto(url, {
        waitUntil: options.waitUntil,
        timeout: options.timeout,
      });

      this.#title = await this.#pptrPage.title();
      this.#favicon = await this.#getFavicon();

      this.#setLoading(false);
    } catch (error) {
      this.#setLoading(false);
      throw error;
    }
  }

  async goBack(options: NavigationOptions): Promise<boolean> {
    if (this.#dialog) {
      return false;
    }

    await this.#pptrPage.goBack({
      waitUntil: options.waitUntil,
      timeout: options.timeout,
    });
    return true;
  }

  async goForward(options: NavigationOptions): Promise<boolean> {
    if (this.#dialog) {
      return false;
    }

    await this.#pptrPage.goForward({
      waitUntil: options.waitUntil,
      timeout: options.timeout,
    });
    return true;
  }

  async reload(options: NavigationOptions): Promise<void> {
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
  }

  async #executeScriptsOnCreate() {
    try {
      const script = iife(this.#scriptsOnCreate.join('\n'));
      await this.#pptrPage.evaluateOnNewDocument(script);
      await this.#pptrPage.evaluate(script);
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
}
