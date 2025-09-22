/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
export interface Viewport {
  width: number;
  height: number;
}
export interface BrowserOptions {
  wsEndpoint: string;
  viewport: Viewport;
}
