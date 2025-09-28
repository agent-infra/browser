/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import delay from 'delay';
import { Logger, ConsoleLogger } from '@agent-infra/logger';

import {
  MAC_SYSTEM_HOTKEY_MAP,
  KEY_ABBR_TO_STANDARD_MAP,
  KEY_LOW_TO_STANDARD_MAP,
} from './key-map';

import type { Page, KeyInput } from 'puppeteer-core';
import type { OSType, BrowserType } from '../types/env';

export interface HotkeyOptions {
  delay: number;
}

export class Hotkey {
  private osName: OSType;
  private browserName: BrowserType;
  private logger: Logger;

  constructor(
    envInfo: { osName: OSType; browserName: BrowserType },
    logger?: Logger,
  ) {
    this.osName = envInfo.osName;
    this.browserName = envInfo.browserName;

    this.logger = logger ?? new ConsoleLogger('Hotkey:');
  }

  /**
   * Format the hotkey string into an array of KeyInput.
   *
   * - example1: 'ctrl+c' -> ['Control', 'C']
   * - example2: 'control+c' -> ['Control', 'C']
   * - example3: 'Control+C' -> ['Control', 'C']
   */
  private formatHotkey(hotkey: string): KeyInput[] {
    const lowerCaseHotkey = hotkey.toLowerCase();
    const keys = lowerCaseHotkey.split(/[\s+]+/);

    this.logger.info('lowerCase keys', keys);

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

    this.logger.info('format keys', formattedKeys);

    return formattedKeys;
  }

  /**
   * adapt for common macOS system and chrome hotkeys
   *
   * see issues: https://github.com/bytedance/UI-TARS-desktop/pull/560
   *
   * example: 'Ctrl+C' -> CDP: { key: 'KeyC', commands: 'Copy' }
   */
  private async macOSCDPHotKey(
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
    const formattedHotkey = this.formatHotkey(hotkey);

    if (this.osName === 'macOS' && this.browserName === 'Chrome') {
      const success = await this.macOSCDPHotKey(page, formattedHotkey, options);
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

  async down(
    page: Page,
    hotkey: string,
    options: Readonly<HotkeyOptions> = { delay: 100 },
  ): Promise<void> {
    const formattedHotkey = this.formatHotkey(hotkey);

    if (this.osName === 'macOS' && this.browserName === 'Chrome') {
      const success = await this.macOSCDPHotKey(page, formattedHotkey, options);
      if (success) {
        return;
      }
    }

    for (const key of formattedHotkey) {
      await page.keyboard.down(key);
    }
  }

  async up(
    page: Page,
    hotkey: string,
    options: Readonly<HotkeyOptions> = { delay: 100 },
  ): Promise<void> {
    const formattedHotkey = this.formatHotkey(hotkey);

    for (const key of formattedHotkey.reverse()) {
      await page.keyboard.up(key);
    }
  }
}
