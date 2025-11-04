/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  Page,
  Point,
  MouseClickOptions,
  MouseMoveOptions,
} from 'puppeteer-core';
import { ScrollDirection, ActionResult } from '../types';
import type { DialogMetaInfo } from '../types';
import type { TabDialog } from '../tabs/dialog';

export class Mouse {
  #vision: VisionMouse;

  constructor(page: Page, dialog: TabDialog) {
    this.#vision = new VisionMouse(page, dialog);
  }

  get vision() {
    return this.#vision;
  }

  // Future: can add DOM mouse support here
  // get dom() {
  //   return this.#dom;
  // }
}

export class VisionMouse {
  #page: Page;
  #dialog: TabDialog;

  constructor(page: Page, dialog: TabDialog) {
    this.#page = page;
    this.#dialog = dialog;
  }

  async click(
    x: number,
    y: number,
    options: Omit<MouseClickOptions, 'clickCount'> = {},
  ): Promise<ActionResult> {
    if (this.#dialog.isOpen) {
      return this.#buildDialogResponse('click');
    }

    await this.#page.mouse.click(x, y, {
      count: options.count,
      delay: options.delay,
      button: options.button,
    });

    return { success: true };
  }

  async move(
    x: number,
    y: number,
    options: MouseMoveOptions = {},
  ): Promise<ActionResult> {
    if (this.#dialog.isOpen) {
      return this.#buildDialogResponse('move');
    }

    await this.#page.mouse.move(x, y, {
      steps: options.steps,
    });

    return { success: true };
  }

  async drag(
    start: Point,
    end: Point,
    options: {
      delay?: number;
    } = {},
  ): Promise<ActionResult> {
    if (this.#dialog.isOpen) {
      return this.#buildDialogResponse('drag');
    }

    await this.#page.mouse.dragAndDrop(start, end, {
      delay: options.delay,
    });

    return { success: true };
  }

  async scroll(
    direction: ScrollDirection,
    delta: number,
  ): Promise<ActionResult> {
    if (this.#dialog.isOpen) {
      return this.#buildDialogResponse('scroll');
    }

    let deltaX = 0;
    let deltaY = 0;

    switch (direction) {
      case 'up':
        break;
      case 'down':
        deltaY = delta;
        break;
      case 'left':
        deltaX = -delta;
        break;
      case 'right':
        deltaX = delta;
        break;
    }

    await this.#page.mouse.wheel({ deltaX, deltaY });

    return { success: true };
  }

  #buildDialogResponse(type: string): ActionResult {
    return {
      success: false,
      message: `Cannot perform mouse.${type}() operation because there is a dialog on the current page.`,
      detail: this.#dialog.meta as DialogMetaInfo,
    };
  }
}