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

import type { Page, KeyInput } from 'puppeteer-core';
import type { OSType, BrowserType } from '../utils';

export interface HotkeyOptions {
  delay: number;
}

export class Hotkey {
  #osName: OSType;
  #browserName: BrowserType;
  constructor(osName: OSType, browserName: BrowserType) {
    this.#osName = osName;
    this.#browserName = browserName;
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

    console.log('lowerCase keys', keys);

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

    console.log('format keys', formattedKeys);

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
    page: Page,
    keys: KeyInput[],
    options: Readonly<HotkeyOptions>,
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
      await page.keyboard.down(command.key, { commands: [command.commands] });
      await delay(options.delay);
      await page.keyboard.up(command.key);

      return true;
    }

    return false;
  }

  async press(
    page: Page,
    hotkey: string,
    options: Readonly<HotkeyOptions> = { delay: 100 },
  ): Promise<void> {
    const formattedHotkey = this.#formatHotkey(hotkey);

    if (this.#osName === 'macOS' && this.#browserName === 'chrome') {
      const success = await this.#macOSCDPHotKey(
        page,
        formattedHotkey,
        options,
      );
      if (success) {
        return;
      }
    }

    // default behavior: press keys one by one
    for (const key of formattedHotkey) {
      await page.keyboard.down(key);
    }
    await delay(options.delay);
    for (const key of formattedHotkey.reverse()) {
      await page.keyboard.up(key);
    }
  }
}
