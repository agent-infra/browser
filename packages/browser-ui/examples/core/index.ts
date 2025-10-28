/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserUI } from '../../src/core';

// Get the container element
const container = document.getElementById('browserContainer');

if (!container) {
  throw new Error('Browser container element not found');
}

// Create and initialize BrowserUI
const browserUI = new BrowserUI({
  root: container,
  browserOptions: {
    // @ts-ignore
    browserWSEndpoint: import.meta.WSEndpoint,
    defaultViewport: {
      width: 900,
      height: 900,
    },
  },
});

// Initialize the browser UI
await browserUI.init();
