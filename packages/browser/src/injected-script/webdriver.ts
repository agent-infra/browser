/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

// install "es6-string-html" vscode Extensions to highlight string code

export const disableWebdriver = /* javascript */ `
function agentInfraDriver() {
  if (window.top !== window) {
    return;
  }
  Object.defineProperty(navigator, 'webdriver', {
    get: () => false
  })
}
agentInfraDriver();
`;