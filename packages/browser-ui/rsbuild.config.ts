/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: './examples/index.tsx',
    },
  },
  output: {
    distPath: {
      root: './distExample',
    },
    minify: true,
    assetPrefix: './',
  },
});
