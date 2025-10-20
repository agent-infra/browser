/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import delay from 'delay';

import {
  MAC_SYSTEM_HOTKEY_MAP,
  KEY_ABBR_TO_STANDARD_MAP,
  KEY_LOW_TO_STANDARD_MAP,
} from '../hotkey/key-map';

import { EnvInfo, KeyboardOptions } from '../types';
import type { KeyInput, Page } from 'puppeteer-core';

export class Keyboard {
  #page: Page;
  #env: EnvInfo;

  constructor(page: Page, env: EnvInfo) {
    this.#page = page;
    this.#env = env;
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

  async press(hotkey: string, options: KeyboardOptions = {}): Promise<void> {
    const formattedHotkey = this.#formatHotkey(hotkey);

    if (this.#env.osName === 'macOS' && this.#env.browserName === 'Chrome') {
      const success = await this.#macOSCDPHotKey(formattedHotkey, options);
      if (success) {
        return;
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
  }

  async down(hotkey: string, options: KeyboardOptions = {}): Promise<void> {
    const formattedHotkey = this.#formatHotkey(hotkey);

    if (this.#env.osName === 'macOS' && this.#env.browserName === 'Chrome') {
      const success = await this.#macOSCDPHotKey(formattedHotkey, options);
      if (success) {
        return;
      }
    }

    for (const key of formattedHotkey) {
      await this.#page.keyboard.down(key);
    }
  }

  async up(hotkey: string): Promise<void> {
    const formattedHotkey = this.#formatHotkey(hotkey);

    for (const key of formattedHotkey.reverse()) {
      await this.#page.keyboard.up(key);
    }
  }

  async type(text: string, options: KeyboardOptions = {}): Promise<void> {
    await this.#page.keyboard.type(text, options);
  }
}
