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

    this.#handleClosedEvent();
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

  #handleClosedEvent() {
    this.#tab.page.on('dialog', this.#dialogHandler);

    // @ts-ignore
    (this.#tab.page._client() as CDPSession).on(
      'Page.javascriptDialogClosed',
      (params) => {
        console.log('Page.javascriptDialogClosed', params);

        if (this.#dialog) {
          this.#tab.emit(TabEvents.TabDialogChanged, {
            tabId: this.#tab.tabId,
            isOpen: false,
          });
          this.#dialog = null;
        }
      },
    );
  }

  #dialogHandler = (dialog: Dialog) => this.#onDialog(dialog);

  async #onDialog(dialog: Dialog) {
    this.#dialog = dialog;

    this.#tab.emit(TabEvents.TabDialogChanged, {
      tabId: this.#tab.tabId,
      isOpen: true,
      type: dialog.type(),
      message: dialog.message(),
      defaultValue: dialog.defaultValue(),
    });
  }

  cleanup() {
    this.#tab.page.off('dialog', this.#dialogHandler);

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
