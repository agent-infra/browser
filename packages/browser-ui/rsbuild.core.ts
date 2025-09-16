/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { defineConfig } from '@rsbuild/core';

export default defineConfig({
  source: {
    entry: {
      index: './examples/core/index.ts',
    },
  },
  html: {
    template: './examples/core/index.html',
  },
  output: {
    distPath: {
      root: './distExample/core',
    },
    minify: true,
    assetPrefix: './',
  },
});
