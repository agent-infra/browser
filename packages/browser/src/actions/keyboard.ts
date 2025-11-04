/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import delay from 'delay';

import {
  MAC_SYSTEM_HOTKEY_MAP,
  KEY_ABBR_TO_STANDARD_MAP,
  KEY_LOW_TO_STANDARD_MAP,
} from './key-map';

import type { KeyInput, Page } from 'puppeteer-core';
import type {
  EnvInfo,
  DialogMetaInfo,
  KeyboardOptions,
  KeyOrHotKeyInput,
  ActionResult,
} from '../types';
import type { TabDialog } from '../tabs/dialog';

export class Keyboard {
  #page: Page;
  #env: EnvInfo;
  #dialog: TabDialog;

  constructor(page: Page, dialog: TabDialog, env: EnvInfo) {
    this.#page = page;
    this.#dialog = dialog;
    this.#env = env;
  }

  /**
   * Enhance puppeteer's [keyboard.press()](https://pptr.dev/api/puppeteer.keyboard.press) to support combination hotkeys.
   */
  async press(
    key: KeyOrHotKeyInput,
    options: KeyboardOptions = {},
  ): Promise<ActionResult> {
    if (this.#dialog.isOpen) {
      return this.#buildDialogResponse('press');
    }

    const formattedHotkey = this.#formatHotkey(key);

    if (this.#env.osName === 'macOS' && this.#env.browserName === 'Chrome') {
      const success = await this.#macOSCDPHotKey(formattedHotkey, options);
      if (success) {
        return { success: true };
      }
    }

    // default behavior: press keys one by one
    for (const key of formattedHotkey) {
      await this.#page.keyboard.down(key);
    }
    await delay(options.delay ?? 0);
    for (const key of formattedHotkey.reverse()) {
      await this.#page.keyboard.up(key);
    }

    return { success: true };
  }

  /**
   * Enhance puppeteer's [keyboard.down()](https://pptr.dev/api/puppeteer.keyboard.down) to support combination hotkeys.
   */
  async down(
    key: KeyOrHotKeyInput,
    options: KeyboardOptions = {},
  ): Promise<ActionResult> {
    if (this.#dialog.isOpen) {
      return this.#buildDialogResponse('down');
    }

    const formattedHotkey = this.#formatHotkey(key);

    if (this.#env.osName === 'macOS' && this.#env.browserName === 'Chrome') {
      const success = await this.#macOSCDPHotKey(formattedHotkey, options);
      if (success) {
        return { success: true };
      }
    }

    for (const key of formattedHotkey) {
      await this.#page.keyboard.down(key);
    }

    return { success: true };
  }

  /**
   * Enhance puppeteer's [keyboard.up()](https://pptr.dev/api/puppeteer.keyboard.up) to support combination hotkeys.
   */
  async up(key: KeyOrHotKeyInput): Promise<ActionResult> {
    if (this.#dialog.isOpen) {
      return this.#buildDialogResponse('up');
    }

    const formattedHotkey = this.#formatHotkey(key);

    for (const key of formattedHotkey.reverse()) {
      await this.#page.keyboard.up(key);
    }

    return { success: true };
  }

  async type(text: string, options: KeyboardOptions = {}): Promise<ActionResult> {
    if (this.#dialog.isOpen) {
      return this.#buildDialogResponse('type');
    }

    if (text.length < 15 && options.delay) {
      await this.#page.keyboard.type(text, options);
    } else {
      await this.#page.keyboard.sendCharacter(text);
    }

    return { success: true };
  }

  /**
   * Format the hotkey string into an array of KeyInput.
   *
   * - example1: 'ctrl+c' -> ['Control', 'C']
   * - example2: 'control+c' -> ['Control', 'C']
   * - example3: 'Control+C' -> ['Control', 'C']
   */
  #formatHotkey(hotkey: string): KeyInput[] {
    const lowerCaseHotkey = hotkey.toLowerCase();
    const keys = lowerCaseHotkey.split(/[\s+]+/);

    const formattedKeys = keys.map((key) => {
      if (KEY_ABBR_TO_STANDARD_MAP[key]) {
        return KEY_ABBR_TO_STANDARD_MAP[key];
      }
      // Lowercase key to standard key
      else if (KEY_LOW_TO_STANDARD_MAP[key]) {
        return KEY_LOW_TO_STANDARD_MAP[key];
      }
      // Unsupported key
      else {
        throw new Error('Unsupported key: ' + key);
      }
    });

    return formattedKeys;
  }

  /**
   * adapt for common macOS system and chrome hotkeys
   *
   * see issues: https://github.com/bytedance/UI-TARS-desktop/pull/560
   *
   * example: 'Ctrl+C' -> CDP: { key: 'KeyC', commands: 'Copy' }
   */
  async #macOSCDPHotKey(
    keys: KeyInput[],
    options: Readonly<KeyboardOptions>,
  ): Promise<boolean> {
    const hotkey = keys
      .map((key) => {
        if (key === 'Control' || key === 'Meta') {
          return 'CorM';
        }
        return key;
      })
      .join('+');

    const command = MAC_SYSTEM_HOTKEY_MAP.get(hotkey);

    if (command) {
      await this.#page.keyboard.down(command.key, {
        commands: [command.commands],
      });
      await delay(options.delay ?? 0);
      await this.#page.keyboard.up(command.key);

      return true;
    }

    return false;
  }

  #buildDialogResponse(type: string): ActionResult {
    return {
      success: false,
      message: `Cannot perform keyboard.${type}() operation because there is a dialog on the current page.`,
      detail: this.#dialog.meta as DialogMetaInfo,
    };
  }
}
