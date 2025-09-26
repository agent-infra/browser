/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.ts'],
    testTimeout: 30000, // Increased from default
    hookTimeout: 30000, // Increased from default
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*'],
      reporter: ['text'],
      reportsDirectory: './coverage',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
