/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { KeyInput, MouseButton } from 'puppeteer-core';
import type { KeyboardDetail } from '../../types';
import { OSType } from '@agent-infra/browser/web';

export function getCdpMouseButton(buttonNumber: number): MouseButton {
  switch (buttonNumber) {
    case 0:
      return 'left';
    case 1:
      return 'middle';
    case 2:
      return 'right';
    case 3:
      return 'back';
    case 4:
      return 'forward';
    default:
      return 'left';
  }
}

/**
 * Only adapt for common macOS system hotkeys
 *
 * See issues:
 * - https://github.com/bytedance/UI-TARS-desktop/pull/560
 *
 * References:
 * - Mac shortcuts list: https://support.apple.com/zh-cn/102650
 * - Chrome: https://support.google.com/chrome/answer/157179
 * - CDP: https://chromedevtools.github.io/devtools-protocol/tot/Input/#method-dispatchKeyEvent
 * - Commands: https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/editing/commands/editor_command_names.h
 */
export function getMacOSHotkey(params: KeyboardDetail): {
  key: KeyInput;
  commands: string;
} | null {
  const { metaKey, ctrlKey, altKey, shiftKey, code } = params;

  if (metaKey && !ctrlKey && !altKey && !shiftKey && code === 'KeyA') {
    return { key: 'KeyA', commands: 'SelectAll' };
  }

  if (metaKey && !ctrlKey && !altKey && !shiftKey && code === 'KeyX') {
    return { key: 'KeyX', commands: 'Cut' };
  }

  if (metaKey && !ctrlKey && !altKey && !shiftKey && code === 'KeyC') {
    return { key: 'KeyC', commands: 'Copy' };
  }

  if (metaKey && !ctrlKey && !altKey && !shiftKey && code === 'KeyV') {
    return { key: 'KeyV', commands: 'Paste' };
  }

  if (metaKey && !ctrlKey && !altKey && !shiftKey && code === 'KeyZ') {
    return { key: 'KeyZ', commands: 'Undo' };
  }

  if (metaKey && !ctrlKey && !altKey && !shiftKey && code === 'KeyY') {
    return { key: 'KeyY', commands: 'Redo' };
  }
  if (metaKey && !ctrlKey && !altKey && shiftKey && code === 'KeyZ') {
    return { key: 'KeyA', commands: 'Redo' };
  }

  return null;
}

export function isPasteHotkey(params: KeyboardDetail, os: OSType) {
  const { metaKey, ctrlKey, altKey, shiftKey, code } = params;

  if (os === 'macOS' && metaKey && !ctrlKey && !altKey && !shiftKey && code === 'KeyV') {
    return true;
  }
  if (!metaKey && ctrlKey && !altKey && !shiftKey && code === 'KeyV') {
    return true;
  }

  return false;
}
