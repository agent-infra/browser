/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Tab, Tabs, type TabOptions } from '@agent-infra/browser/web';
import { ScreencastRenderer } from './screencast-renderer';

import type { Browser, Page } from 'puppeteer-core';
import type { UITabOptions, UITabsOptions } from '../types';

export class UITabs extends Tabs<UITab> {
  #canvas: HTMLCanvasElement;
  #options: UITabsOptions;

  static async UICreate(
    browser: Browser,
    canvas: HTMLCanvasElement,
    options: UITabsOptions,
  ): Promise<UITabs> {
    const tabs = new UITabs(browser, canvas, options);
    await tabs.initializeExistingTabs();
    return tabs;
  }

  constructor(
    browser: Browser,
    canvas: HTMLCanvasElement,
    options: UITabsOptions,
  ) {
    super(browser, options);
    this.#canvas = canvas;
    this.#options = options;
  }

  override async createTabInstance(
    page: Page,
    options: TabOptions,
  ): Promise<UITab> {
    const uiOptions: UITabOptions = {
      ...options,
      cast: this.#options.cast,
      injectVisibilityScript: true,
    };
    const tab = new UITab(page, this.#canvas, uiOptions);
    await tab.init();

    return tab;
  }
}

export class UITab extends Tab {
  #renderer: ScreencastRenderer;

  constructor(page: Page, canvas: HTMLCanvasElement, options: UITabOptions) {
    super(page, options);

    this.#renderer = new ScreencastRenderer(page, canvas, {
      tabId: options.tabId,
      viewport: options.viewport,
      cast: options.cast,
    });
  }

  getRenderer(): ScreencastRenderer {
    return this.#renderer;
  }

  /**
   * @internal
   */
  override async _active() {
    super._active();
    this.#renderer.start();
  }

  /**
   * @internal
   */
  override async _inactive() {
    super._inactive();
    this.#renderer.stop();
  }
}
