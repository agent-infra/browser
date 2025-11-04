/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type {
  Viewport,
  Protocol,
  PuppeteerLifeCycleEvent,
  ScreenshotOptions,
} from 'puppeteer-core';

import type { EnvInfo } from './env';
import type { UserAgentInfo } from './browser';

export interface TabsOptions {
  viewport: Viewport;
  envInfo: EnvInfo;
  userAgentInfo?: UserAgentInfo;
}

export interface TabOptions extends TabsOptions {
  tabId: string;
}

export const enum TabEvents {
  TabLoadingStateChanged = 'tabLoadingStateChanged',
  TabUrlChanged = 'tabUrlChanged',
  TabVisibilityChanged = 'TabVisibilityChanged',
  TabDialogChanged = 'TabDialogChanged',
}

export interface TabEventsMap {
  [TabEvents.TabLoadingStateChanged]: {
    tabId: string;
    isLoading: boolean;
  };
  [TabEvents.TabUrlChanged]: {
    tabId: string;
    oldUrl: string;
    newUrl: string;
  };
  [TabEvents.TabVisibilityChanged]: {
    tabId: string;
    isVisible: boolean;
  };
  [TabEvents.TabDialogChanged]: {
    tabId: string;
    isOpen: boolean;
    type?: Protocol.Page.DialogType;
    message?: string;
    defaultValue?: string;
  };
}

export interface DialogMeta {
  type: Protocol.Page.DialogType;
  message: string;
  defaultValue: string;
}

export interface TabMeta {
  id: string;
  title: string;
  url: string;
  favicon: string | null;
  isLoading: boolean;
  isActive: boolean;
  dialog?: DialogMeta;
}

export interface TabsState {
  tabs: Map<string, TabMeta>;
  activeTabId: string | null;
}

export interface TabsOperationTracker {
  creatingTargetIds: Set<string>;
  switchingTargetIds: Set<string>;
  closingTargetIds: Set<string>;
}

export interface NavigationOptions {
  waitUntil?: PuppeteerLifeCycleEvent[];
  timeout?: number;
}

export interface NavigationSuccessResult {
  success: true;
  url: string;
}
export interface NavigationErrorResult {
  success: false;
  url: string;
  message: string;
}

export type NavigationResult = NavigationSuccessResult | NavigationErrorResult;


export type TabScreenshotOptions = Pick<
  ScreenshotOptions,
  'type' | 'quality' | 'fullPage' | 'path'
>;

export interface BaseScreenshotResult {
  type: string;
  width: number;
  height: number;
}

export interface ScreenshotResultWithPath extends BaseScreenshotResult {
  data: Uint8Array;
}

export interface ScreenshotResultWithoutPath extends BaseScreenshotResult {
  data: string;
}

export type TabScreenshotResult<T extends TabScreenshotOptions> =
  T extends { path: string }
    ? ScreenshotResultWithPath
    : ScreenshotResultWithoutPath;
