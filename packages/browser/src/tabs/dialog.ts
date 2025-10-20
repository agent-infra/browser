/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Dialog, CDPSession } from 'puppeteer-core';

import type { Tab } from './tab';
import { TabEvents } from '../types';

export class TabDialog {
  #tab: Tab;
  #dialog: Dialog | null = null;

  constructor(tab: Tab) {
    this.#tab = tab;

    this.#handleEvent();
  }

  get isOpen(): boolean {
    return this.#dialog !== null;
  }

  get meta() {
    if (this.#dialog) {
      return {
        type: this.#dialog.type(),
        message: this.#dialog.message(),
        defaultValue: this.#dialog.defaultValue(),
      };
    }

    return null;
  }

  setDialog(dialog: Dialog | null) {
    this.#dialog = dialog;
  }

  #handleEvent() {
    this.#tab.page.on('dialog', this.#openHandler);
    // @ts-ignore
    (this.#tab.page._client() as CDPSession).on('Page.javascriptDialogClosed', this.#closeHandler);
  }

  #openHandler = (dialog: Dialog) => {
    this.#dialog = dialog;

    this.#tab.emit(TabEvents.TabDialogChanged, {
      tabId: this.#tab.tabId,
      isOpen: true,
      type: dialog.type(),
      message: dialog.message(),
      defaultValue: dialog.defaultValue(),
    });
  }

  #closeHandler = () => {
    if (this.#dialog) {
      this.#tab.emit(TabEvents.TabDialogChanged, {
        tabId: this.#tab.tabId,
        isOpen: false,
      });
      this.#dialog = null;
    }
  }

  cleanup() {
    this.#tab.page.off('dialog', this.#openHandler);
    // @ts-ignore
    (this.#tab.page._client() as CDPSession).off('Page.javascriptDialogClosed', this.#closeHandler);

    this.#dialog = null;
  }

  async accept(promptText?: string): Promise<boolean> {
    if (!this.#dialog) {
      return false;
    }

    try {
      await this.#dialog.accept(promptText);
      this.#tab.emit(TabEvents.TabDialogChanged, {
        tabId: this.#tab.tabId,
        isOpen: false,
      });

      this.#dialog = null;
      return true;
    } catch (error) {
      console.error('Failed to accept dialog:', error);
      return false;
    }
  }

  async dismiss(): Promise<boolean> {
    if (!this.#dialog) {
      return false;
    }

    try {
      await this.#dialog.dismiss();
      this.#tab.emit(TabEvents.TabDialogChanged, {
        tabId: this.#tab.tabId,
        isOpen: false,
      });

      this.#dialog = null;
      return true;
    } catch (error) {
      console.error('Failed to dismiss dialog:', error);
      return false;
    }
  }
}
