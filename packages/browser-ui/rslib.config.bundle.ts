/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
// import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rslib/core';

const BANNER = `/**
* Copyright (c) 2025 Bytedance, Inc. and its affiliates.
* SPDX-License-Identifier: Apache-2.0
*/`;

export default defineConfig({
  source: {
    entry: {
      index: 'src/index.ts',
    },
    decorators: {
      version: 'legacy',
    },
  },
  lib: [
    {
      format: 'umd',
      syntax: 'es2021',
      bundle: true,
      dts: false,
      banner: { js: BANNER },
      umdName: 'agent_infra_browser_ui',
      output: {
        minify: true,
        externals: ['chromium-bidi/lib/cjs/bidiMapper/BidiMapper.js'],
        distPath: {
          root: 'dist/bundle/',
        },
      },
    },
  ],
  // performance: {
  //   bundleAnalyze: {},
  // },
  output: {
    target: 'web',
    sourceMap: true,
  },
});
