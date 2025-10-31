/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  Tab,
  Tabs,
  type TabOptions,
  type TabsOptions,
} from '@agent-infra/browser/web';
import { ScreencastRenderer } from './screencast-renderer';

import type { Browser, Page } from 'puppeteer-core';

export class UITab extends Tab {
  #renderer: ScreencastRenderer;

  constructor(page: Page, canvas: HTMLCanvasElement, options: TabOptions) {
    super(page, options);

    this.#renderer = new ScreencastRenderer(page, canvas, {
      tabId: options.tabId,
      viewport: options.viewport,
    });
  }

  getRenderer(): ScreencastRenderer {
    return this.#renderer;
  }

  override async active() {
    super.active();
    this.#renderer.start();
  }

  override async inactive() {
    super.inactive();
    this.#renderer.stop();
  }
}

export class UITabs extends Tabs<UITab> {
  #canvas: HTMLCanvasElement;

  static async UICreate(
    browser: Browser,
    canvas: HTMLCanvasElement,
    options: TabsOptions,
  ): Promise<UITabs> {
    const tabs = new UITabs(browser, canvas, options);
    await tabs.initializeExistingTabs();
    return tabs;
  }

  constructor(
    browser: Browser,
    canvas: HTMLCanvasElement,
    options: TabsOptions,
  ) {
    super(browser, options);
    this.#canvas = canvas;
  }

  override createTabInstance(page: Page, options: TabOptions): UITab {
    return new UITab(page, this.#canvas, options);
  }
}
