/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hotkey } from './index';
import type { Page } from 'puppeteer-core';
import type { OSType, BrowserType } from '../types/env';

// Mock delay module
vi.mock('delay', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

describe('Hotkey', () => {
  let mockPage: Page;
  let mockKeyboard: {
    down: ReturnType<typeof vi.fn>;
    up: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockKeyboard = {
      down: vi.fn().mockResolvedValue(undefined),
      up: vi.fn().mockResolvedValue(undefined),
    };

    mockPage = {
      keyboard: mockKeyboard,
    } as unknown as Page;

    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with correct OS and browser', () => {
      const hotkey = new Hotkey({ osName: 'macOS', browserName: 'Chrome'});
      expect(hotkey).toBeInstanceOf(Hotkey);
    });

    it('should work with different OS and browser combinations', () => {
      const combinations: Array<[OSType, BrowserType]> = [
        ['Windows', 'Chrome'],
        ['Linux', 'Firefox'],
        ['macOS', 'Edge'],
        ['Unknown', 'Unknown'],
      ];

      combinations.forEach(([os, browser]) => {
        const hotkey = new Hotkey({ osName: os, browserName: browser });
        expect(hotkey).toBeInstanceOf(Hotkey);
      });
    });
  });

  describe('press method', () => {
    it('should handle simple key combinations', async () => {
      const hotkey = new Hotkey({ osName: 'Windows', browserName: 'Chrome' });

      await hotkey.press(mockPage, 'ctrl+c');

      expect(mockKeyboard.down).toHaveBeenCalledWith('Control');
      expect(mockKeyboard.down).toHaveBeenCalledWith('C');
      expect(mockKeyboard.up).toHaveBeenCalledWith('C');
      expect(mockKeyboard.up).toHaveBeenCalledWith('Control');
    });

    it('should handle abbreviations correctly', async () => {
      const hotkey = new Hotkey({ osName: 'Windows', browserName: 'Chrome' });

      await hotkey.press(mockPage, 'ctrl+esc');

      expect(mockKeyboard.down).toHaveBeenCalledWith('Control');
      expect(mockKeyboard.down).toHaveBeenCalledWith('Escape');
    });

    it('should handle multiple modifier keys', async () => {
      const hotkey = new Hotkey({ osName: 'Windows', browserName: 'Chrome' });

      await hotkey.press(mockPage, 'ctrl+shift+z');

      expect(mockKeyboard.down).toHaveBeenCalledWith('Control');
      expect(mockKeyboard.down).toHaveBeenCalledWith('Shift');
      expect(mockKeyboard.down).toHaveBeenCalledWith('Z');
      expect(mockKeyboard.up).toHaveBeenCalledWith('Z');
      expect(mockKeyboard.up).toHaveBeenCalledWith('Shift');
      expect(mockKeyboard.up).toHaveBeenCalledWith('Control');
    });

    it('should handle case insensitive input', async () => {
      const hotkey = new Hotkey({ osName: 'Windows', browserName: 'Chrome' });

      await hotkey.press(mockPage, 'CTRL+C');

      expect(mockKeyboard.down).toHaveBeenCalledWith('Control');
      expect(mockKeyboard.down).toHaveBeenCalledWith('C');
    });

    it('should handle custom delay option', async () => {
      const hotkey = new Hotkey({ osName: 'Windows', browserName: 'Chrome' });
      const delay = await import('delay');

      await hotkey.press(mockPage, 'ctrl+c', { delay: 200 });

      expect(delay.default).toHaveBeenCalledWith(200);
    });

    it('should use default delay when no options provided', async () => {
      const hotkey = new Hotkey({ osName: 'Windows', browserName: 'Chrome' });
      const delay = await import('delay');

      await hotkey.press(mockPage, 'ctrl+c');

      expect(delay.default).toHaveBeenCalledWith(100);
    });

    it('should throw error for unsupported keys', async () => {
      const hotkey = new Hotkey({ osName: 'Windows', browserName: 'Chrome' });

      await expect(hotkey.press(mockPage, 'unsupported+key')).rejects.toThrow(
        'Unsupported key: unsupported',
      );
    });
  });

  describe('macOS Chrome special handling', () => {
    it('should use CDP commands for common macOS shortcuts', async () => {
      const hotkey = new Hotkey({ osName: 'macOS', browserName: 'Chrome'});

      await hotkey.press(mockPage, 'cmd+c');

      // Should use CDP command instead of regular key press
      expect(mockKeyboard.down).toHaveBeenCalledWith('KeyC', {
        commands: ['Copy'],
      });
      expect(mockKeyboard.up).toHaveBeenCalledWith('KeyC');
      expect(mockKeyboard.down).toHaveBeenCalledTimes(1);
    });

    it('should handle Control key as Meta on macOS', async () => {
      const hotkey = new Hotkey({ osName: 'macOS', browserName: 'Chrome' });

      await hotkey.press(mockPage, 'ctrl+c');

      expect(mockKeyboard.down).toHaveBeenCalledWith('KeyC', {
        commands: ['Copy'],
      });
    });

    it('should handle various macOS shortcuts', async () => {
      const hotkey = new Hotkey({ osName: 'macOS', browserName: 'Chrome' });

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

        await hotkey.press(mockPage, input);

        expect(mockKeyboard.down).toHaveBeenCalledWith(expect.any(String), {
          commands: [expectedCommand],
        });
      }
    });

    it('should fallback to regular key press for unsupported macOS shortcuts', async () => {
      const hotkey = new Hotkey({ osName: 'macOS', browserName: 'Chrome' });

      await hotkey.press(mockPage, 'cmd+f');

      // Should fallback to regular key press
      expect(mockKeyboard.down).toHaveBeenCalledWith('Meta');
      expect(mockKeyboard.down).toHaveBeenCalledWith('F');
      expect(mockKeyboard.up).toHaveBeenCalledWith('F');
      expect(mockKeyboard.up).toHaveBeenCalledWith('Meta');
    });

    it('should not use CDP commands for non-macOS systems', async () => {
      const hotkey = new Hotkey({ osName: 'Windows', browserName: 'Chrome' });

      await hotkey.press(mockPage, 'ctrl+c');

      // Should use regular key press
      expect(mockKeyboard.down).toHaveBeenCalledWith('Control');
      expect(mockKeyboard.down).toHaveBeenCalledWith('C');
      expect(mockKeyboard.down).not.toHaveBeenCalledWith('C', {
        commands: ['Copy'],
      });
    });

    it('should not use CDP commands for non-Chrome browsers on macOS', async () => {
      const hotkey = new Hotkey({ osName: 'macOS', browserName: 'Firefox' });

      await hotkey.press(mockPage, 'cmd+c');

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
      const hotkey = new Hotkey({ osName: 'Windows', browserName: 'Chrome' });

      await hotkey.press(mockPage, 'ctrl + c');

      expect(mockKeyboard.down).toHaveBeenCalledWith('Control');
      expect(mockKeyboard.down).toHaveBeenCalledWith('C');
    });

    it('should handle different key abbreviations', async () => {
      const hotkey = new Hotkey({ osName: 'Windows', browserName: 'Chrome' });

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

        await hotkey.press(mockPage, input);

        expectedKeys.forEach((key) => {
          expect(mockKeyboard.down).toHaveBeenCalledWith(key);
        });
      }
    });

    it('should handle function keys', async () => {
      const hotkey = new Hotkey({ osName: 'Windows', browserName: 'Chrome' });

      await hotkey.press(mockPage, 'ctrl+f1');

      expect(mockKeyboard.down).toHaveBeenCalledWith('Control');
      expect(mockKeyboard.down).toHaveBeenCalledWith('F1');
    });

    it('should handle number keys', async () => {
      const hotkey = new Hotkey({ osName: 'Windows', browserName: 'Chrome' });

      await hotkey.press(mockPage, 'ctrl+1');

      expect(mockKeyboard.down).toHaveBeenCalledWith('Control');
      expect(mockKeyboard.down).toHaveBeenCalledWith('1');
    });
  });

  describe('key press sequence', () => {
    it('should press keys in correct order and release in reverse order', async () => {
      const hotkey = new Hotkey({ osName: 'Windows', browserName: 'Chrome' });

      await hotkey.press(mockPage, 'ctrl+shift+a');

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
});
