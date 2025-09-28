/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @agent-infra/browser
 * A browser automation library based on puppeteer-core
 *
 * Main exports:
 * - types: Type definitions for browser interfaces
 * - LocalBrowser: Control locally installed browsers
 * - RemoteBrowser: Connect to remote browser instances
 * - BaseBrowser: Abstract base class for browser implementations
 */
export * from './types';
export * from './local-browser';
export * from './remote-browser';
export * from './base-browser';
