/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MouseButton } from 'puppeteer-core';

export type MouseEventType = 'mousemove' | 'mousedown' | 'mouseup';

export type KeyboardEventType = 'keydown' | 'keyup';

export interface MouseDetail {
  type: MouseEventType;
  x: number;
  y: number;
  button: MouseButton;
}

export interface WheelDetail {
  deltaX: number;
  deltaY: number;
}

export interface KeyboardDetail {
  type: KeyboardEventType;
  key: string;
  code: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

export interface ClipboardDetail {
  content: string;
}

export interface TabEventDetail {
  tabId: string;
}

export interface NavigationEventDetail {
  url: string;
}

export interface NavigationActionEventDetail {
  action: 'back' | 'forward' | 'refresh';
}

export interface DialogAcceptEventDetail {
  inputValue?: string;
}
