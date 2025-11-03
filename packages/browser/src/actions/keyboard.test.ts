/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Keyboard } from './keyboard';
import type { Page } from 'puppeteer-core';
import type { EnvInfo } from '../types';
import type { TabDialog } from '../tabs/dialog';

// Mock delay module
vi.mock('delay', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

describe('Keyboard', () => {
  let mockPage: Page;
  let mockKeyboard: {
    down: ReturnType<typeof vi.fn>;
    up: ReturnType<typeof vi.fn>;
    type: ReturnType<typeof vi.fn>;
    sendCharacter: ReturnType<typeof vi.fn>;
  };
  let mockDialog: TabDialog;

  beforeEach(() => {
    mockKeyboard = {
      down: vi.fn().mockResolvedValue(undefined),
      up: vi.fn().mockResolvedValue(undefined),
      type: vi.fn().mockResolvedValue(undefined),
      sendCharacter: vi.fn().mockResolvedValue(undefined),
    };

    mockPage = {
      keyboard: mockKeyboard,
    } as unknown as Page;

    // @ts-ignore
    mockDialog = {
      isOpen: false,
    }

    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with correct OS and browser', () => {
      const keyboard = new Keyboard(mockPage, mockDialog, { osName: 'macOS', browserName: 'Chrome', browserVersion: '140' });
      expect(keyboard).toBeInstanceOf(Keyboard);
    });

    it('should work with different OS and browser combinations', () => {
      const combinations: Array<[EnvInfo['osName'], EnvInfo['browserName']]> = [
        ['Windows', 'Chrome'],
        ['Linux', 'Firefox'],
        ['macOS', 'Edge'],
        ['Unknown', 'Unknown'],
      ];

      combinations.forEach(([os, browser]) => {
        const keyboard = new Keyboard(mockPage, mockDialog, {
          osName: os,
          browserName: browser,
          browserVersion: '140',
        });
        expect(keyboard).toBeInstanceOf(Keyboard);
      });
    });
  });

  describe('press method', () => {
    it('should handle simple key combinations', async () => {
      const keyboard = new Keyboard(mockPage, mockDialog, {
        osName: 'Windows',
        browserName: 'Chrome',
        browserVersion: '140',
      });

      await keyboard.press('ctrl+c');

      expect(mockKeyboard.down).toHaveBeenCalledWith('Control');
      expect(mockKeyboard.down).toHaveBeenCalledWith('C');
      expect(mockKeyboard.up).toHaveBeenCalledWith('C');
      expect(mockKeyboard.up).toHaveBeenCalledWith('Control');
    });

    it('should handle abbreviations correctly', async () => {
      const keyboard = new Keyboard(mockPage, mockDialog, {
        osName: 'Windows',
        browserName: 'Chrome',
        browserVersion: '140',
      });

      await keyboard.press('ctrl+esc');

      expect(mockKeyboard.down).toHaveBeenCalledWith('Control');
      expect(mockKeyboard.down).toHaveBeenCalledWith('Escape');
    });

    it('should handle multiple modifier keys', async () => {
      const keyboard = new Keyboard(mockPage, mockDialog, {
        osName: 'Windows',
        browserName: 'Chrome',
        browserVersion: '140',
      });

      await keyboard.press('ctrl+shift+z');

      expect(mockKeyboard.down).toHaveBeenCalledWith('Control');
      expect(mockKeyboard.down).toHaveBeenCalledWith('Shift');
      expect(mockKeyboard.down).toHaveBeenCalledWith('Z');
      expect(mockKeyboard.up).toHaveBeenCalledWith('Z');
      expect(mockKeyboard.up).toHaveBeenCalledWith('Shift');
      expect(mockKeyboard.up).toHaveBeenCalledWith('Control');
    });

    it('should handle case insensitive input', async () => {
      const keyboard = new Keyboard(mockPage, mockDialog, {
        osName: 'Windows',
        browserName: 'Chrome',
        browserVersion: '140',
      });

      await keyboard.press('CTRL+C');

      expect(mockKeyboard.down).toHaveBeenCalledWith('Control');
      expect(mockKeyboard.down).toHaveBeenCalledWith('C');
    });

    it('should handle custom delay option', async () => {
      const keyboard = new Keyboard(mockPage, mockDialog, {
        osName: 'Windows',
        browserName: 'Chrome',
        browserVersion: '140',
      });
      const delay = await import('delay');

      await keyboard.press('ctrl+c', { delay: 200 });

      expect(delay.default).toHaveBeenCalledWith(200);
    });

    it('should use default delay when no options provided', async () => {
      const keyboard = new Keyboard(mockPage, mockDialog, {
        osName: 'Windows',
        browserName: 'Chrome',
        browserVersion: '140',
      });
      const delay = await import('delay');

      await keyboard.press('ctrl+c');

      expect(delay.default).toHaveBeenCalledWith(0);
    });

    it('should throw error for unsupported keys', async () => {
      const keyboard = new Keyboard(mockPage, mockDialog, {
        osName: 'Windows',
        browserName: 'Chrome',
        browserVersion: '140',
      });

      await expect(keyboard.press('unsupported+key')).rejects.toThrow(
        'Unsupported key: unsupported',
      );
    });
  });

  describe('macOS Chrome special handling', () => {
    it('should use CDP commands for common macOS shortcuts', async () => {
      const keyboard = new Keyboard(mockPage, mockDialog, {
        osName: 'macOS',
        browserName: 'Chrome',
        browserVersion: '140',
      });

      await keyboard.press('cmd+c');

      // Should use CDP command instead of regular key press
      expect(mockKeyboard.down).toHaveBeenCalledWith('KeyC', {
        commands: ['Copy'],
      });
      expect(mockKeyboard.up).toHaveBeenCalledWith('KeyC');
      expect(mockKeyboard.down).toHaveBeenCalledTimes(1);
    });

    it('should handle Control key as Meta on macOS', async () => {
      const keyboard = new Keyboard(mockPage, mockDialog, {
        osName: 'macOS',
        browserName: 'Chrome',
        browserVersion: '140',
      });

      await keyboard.press('ctrl+c');

      expect(mockKeyboard.down).toHaveBeenCalledWith('KeyC', {
        commands: ['Copy'],
      });
    });

    it('should handle various macOS shortcuts', async () => {
      const keyboard = new Keyboard(mockPage, mockDialog, {
        osName: 'macOS',
        browserName: 'Chrome',
        browserVersion: '140',
      });

      const shortcuts = [
        { input: 'cmd+a', expectedCommand: 'SelectAll' },
        { input: 'cmd+x', expectedCommand: 'Cut' },
        { input: 'cmd+v', expectedCommand: 'Paste' },
        { input: 'cmd+z', expectedCommand: 'Undo' },
        { input: 'cmd+y', expectedCommand: 'Redo' },
        { input: 'cmd+shift+z', expectedCommand: 'Redo' },
        { input: 'shift+cmd+z', expectedCommand: 'Redo' },

        { input: 'cmd+keya', expectedCommand: 'SelectAll' },
        { input: 'cmd+keyx', expectedCommand: 'Cut' },
        { input: 'cmd+keyv', expectedCommand: 'Paste' },
        { input: 'cmd+keyz', expectedCommand: 'Undo' },
        { input: 'cmd+keyy', expectedCommand: 'Redo' },
        { input: 'cmd+shift+keyz', expectedCommand: 'Redo' },
      ];

      for (const { input, expectedCommand } of shortcuts) {
        vi.clearAllMocks();

        await keyboard.press(input);

        expect(mockKeyboard.down).toHaveBeenCalledWith(expect.any(String), {
          commands: [expectedCommand],
        });
      }
    });

    it('should fallback to regular key press for unsupported macOS shortcuts', async () => {
      const keyboard = new Keyboard(mockPage, mockDialog, {
        osName: 'macOS',
        browserName: 'Chrome',
        browserVersion: '140',
      });

      await keyboard.press('cmd+f');

      // Should fallback to regular key press
      expect(mockKeyboard.down).toHaveBeenCalledWith('Meta');
      expect(mockKeyboard.down).toHaveBeenCalledWith('F');
      expect(mockKeyboard.up).toHaveBeenCalledWith('F');
      expect(mockKeyboard.up).toHaveBeenCalledWith('Meta');
    });

    it('should not use CDP commands for non-macOS systems', async () => {
      const keyboard = new Keyboard(mockPage, mockDialog, {
        osName: 'Windows',
        browserName: 'Chrome',
        browserVersion: '140',
      });

      await keyboard.press('ctrl+c');

      // Should use regular key press
      expect(mockKeyboard.down).toHaveBeenCalledWith('Control');
      expect(mockKeyboard.down).toHaveBeenCalledWith('C');
      expect(mockKeyboard.down).not.toHaveBeenCalledWith('C', {
        commands: ['Copy'],
      });
    });

    it('should not use CDP commands for non-Chrome browsers on macOS', async () => {
      const keyboard = new Keyboard(mockPage, mockDialog, {
        osName: 'macOS',
        browserName: 'Firefox',
        browserVersion: '140',
      });

      await keyboard.press('cmd+c');

      // Should use regular key press
      expect(mockKeyboard.down).toHaveBeenCalledWith('Meta');
      expect(mockKeyboard.down).toHaveBeenCalledWith('C');
      expect(mockKeyboard.down).not.toHaveBeenCalledWith('C', {
        commands: ['Copy'],
      });
    });
  });

  describe('key formatting', () => {
    it('should handle spaces in hotkey string', async () => {
      const keyboard = new Keyboard(mockPage, mockDialog, {
        osName: 'Windows',
        browserName: 'Chrome',
        browserVersion: '140',
      });

      await keyboard.press('ctrl + c');

      expect(mockKeyboard.down).toHaveBeenCalledWith('Control');
      expect(mockKeyboard.down).toHaveBeenCalledWith('C');
    });

    it('should handle different key abbreviations', async () => {
      const keyboard = new Keyboard(mockPage, mockDialog, {
        osName: 'Windows',
        browserName: 'Chrome',
        browserVersion: '140',
      });

      const keyMappings = [
        { input: 'cmd+c', expectedKeys: ['Meta', 'C'] },
        { input: 'command+c', expectedKeys: ['Meta', 'C'] },
        { input: 'opt+c', expectedKeys: ['Alt', 'C'] },
        { input: 'option+c', expectedKeys: ['Alt', 'C'] },
        { input: 'ctrl+up', expectedKeys: ['Control', 'ArrowUp'] },
        { input: 'ctrl+down', expectedKeys: ['Control', 'ArrowDown'] },
        { input: 'ctrl+left', expectedKeys: ['Control', 'ArrowLeft'] },
        { input: 'ctrl+right', expectedKeys: ['Control', 'ArrowRight'] },
        { input: 'ctrl+esc', expectedKeys: ['Control', 'Escape'] },
        { input: 'ctrl+del', expectedKeys: ['Control', 'Delete'] },
        { input: 'ctrl+ins', expectedKeys: ['Control', 'Insert'] },
        { input: 'ctrl+pgup', expectedKeys: ['Control', 'PageUp'] },
        { input: 'ctrl+pgdown', expectedKeys: ['Control', 'PageDown'] },
        { input: 'ctrl+return', expectedKeys: ['Control', 'Enter'] },
      ];

      for (const { input, expectedKeys } of keyMappings) {
        vi.clearAllMocks();

        await keyboard.press(input);

        expectedKeys.forEach((key) => {
          expect(mockKeyboard.down).toHaveBeenCalledWith(key);
        });
      }
    });

    it('should handle function keys', async () => {
      const keyboard = new Keyboard(mockPage, mockDialog, {
        osName: 'Windows',
        browserName: 'Chrome',
        browserVersion: '140',
      });

      await keyboard.press('ctrl+f1');

      expect(mockKeyboard.down).toHaveBeenCalledWith('Control');
      expect(mockKeyboard.down).toHaveBeenCalledWith('F1');
    });

    it('should handle number keys', async () => {
      const keyboard = new Keyboard(mockPage, mockDialog, {
        osName: 'Windows',
        browserName: 'Chrome',
        browserVersion: '140',
      });

      await keyboard.press('ctrl+1');

      expect(mockKeyboard.down).toHaveBeenCalledWith('Control');
      expect(mockKeyboard.down).toHaveBeenCalledWith('1');
    });
  });

  describe('key press sequence', () => {
    it('should press keys in correct order and release in reverse order', async () => {
      const keyboard = new Keyboard(mockPage, mockDialog, {
        osName: 'Windows',
        browserName: 'Chrome',
        browserVersion: '140',
      });

      await keyboard.press('ctrl+shift+a');

      // Check press order
      expect(mockKeyboard.down).toHaveBeenNthCalledWith(1, 'Control');
      expect(mockKeyboard.down).toHaveBeenNthCalledWith(2, 'Shift');
      expect(mockKeyboard.down).toHaveBeenNthCalledWith(3, 'A');

      // Check release order (reverse)
      expect(mockKeyboard.up).toHaveBeenNthCalledWith(1, 'A');
      expect(mockKeyboard.up).toHaveBeenNthCalledWith(2, 'Shift');
      expect(mockKeyboard.up).toHaveBeenNthCalledWith(3, 'Control');
    });
  });

  describe('down method', () => {
    it('should press keys down in correct order', async () => {
      const keyboard = new Keyboard(mockPage, mockDialog, {
        osName: 'Windows',
        browserName: 'Chrome',
        browserVersion: '140',
      });

      await keyboard.down('ctrl+alt+a');

      expect(mockKeyboard.down).toHaveBeenNthCalledWith(1, 'Control');
      expect(mockKeyboard.down).toHaveBeenNthCalledWith(2, 'Alt');
      expect(mockKeyboard.down).toHaveBeenNthCalledWith(3, 'A');
      expect(mockKeyboard.up).not.toHaveBeenCalled();
    });

    it('should handle macOS Chrome CDP commands for down method', async () => {
      const keyboard = new Keyboard(mockPage, mockDialog, {
        osName: 'macOS',
        browserName: 'Chrome',
        browserVersion: '140',
      });

      await keyboard.down('cmd+c');

      expect(mockKeyboard.down).toHaveBeenCalledWith('KeyC', {
        commands: ['Copy'],
      });
      expect(mockKeyboard.up).not.toHaveBeenCalled();
    });
  });

  describe('up method', () => {
    it('should release keys in reverse order', async () => {
      const keyboard = new Keyboard(mockPage, mockDialog, {
        osName: 'Windows',
        browserName: 'Chrome',
        browserVersion: '140',
      });

      await keyboard.up('ctrl+shift+a');

      expect(mockKeyboard.down).not.toHaveBeenCalled();
      expect(mockKeyboard.up).toHaveBeenNthCalledWith(1, 'A');
      expect(mockKeyboard.up).toHaveBeenNthCalledWith(2, 'Shift');
      expect(mockKeyboard.up).toHaveBeenNthCalledWith(3, 'Control');
    });
  });

  describe('type method', () => {
    it('should use keyboard.type for short text with delay', async () => {
      const keyboard = new Keyboard(mockPage, mockDialog, {
        osName: 'Windows',
        browserName: 'Chrome',
        browserVersion: '140',
      });

      await keyboard.type('hello', { delay: 50 });

      expect(mockKeyboard.type).toHaveBeenCalledWith('hello', { delay: 50 });
      expect(mockKeyboard.sendCharacter).not.toHaveBeenCalled();
    });

    it('should use sendCharacter for long text', async () => {
      const keyboard = new Keyboard(mockPage, mockDialog, {
        osName: 'Windows',
        browserName: 'Chrome',
        browserVersion: '140',
      });

      await keyboard.type('this is a very long text that should use sendCharacter method instead of type method');

      expect(mockKeyboard.type).not.toHaveBeenCalled();
      expect(mockKeyboard.sendCharacter).toHaveBeenCalledWith('this is a very long text that should use sendCharacter method instead of type method');
    });

    it('should use sendCharacter for text without delay', async () => {
      const keyboard = new Keyboard(mockPage, mockDialog, {
        osName: 'Windows',
        browserName: 'Chrome',
        browserVersion: '140',
      });

      await keyboard.type('hello world');

      expect(mockKeyboard.type).not.toHaveBeenCalled();
      expect(mockKeyboard.sendCharacter).toHaveBeenCalledWith('hello world');
    });
  });
});
