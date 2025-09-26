/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Viewport } from 'puppeteer-core';
export interface BrowserOptions {
  wsEndpoint: string;
  viewport: Viewport;
}
