/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
export const iife = (script: string) => /* javascript */ `(() => {
  if (!window.__agent_infra_browser) {
    window.__agent_infra_browser = {};
  }
  ${script}
})();`;
