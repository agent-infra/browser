/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Viewport } from 'puppeteer-core';

export interface ScreenCastOptions {
  tabId: string;
  viewport: Viewport;
  cast?: {
    format: 'jpeg' | 'png';
    /**
     * Compression quality from range [0..100].
     */
    quality: number;
    /**
     * Send every n-th frame.
     */
    everyNthFrame: number;
  };
}
