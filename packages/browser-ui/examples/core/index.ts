/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserUI } from '../../src';

const container = document.getElementById('browserContainer');
if (!container) {
  throw new Error('Browser container element not found');
}

BrowserUI.create({
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
