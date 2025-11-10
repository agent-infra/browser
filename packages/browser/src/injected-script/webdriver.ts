/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

// install "es6-string-html" vscode Extensions to highlight string code

export const disableWebdriver = /* javascript */ `
function agentInfraDriver() {
  if (window.__agent_infra_browser.webdriver) {
    return;
  }
  window.__agent_infra_browser.webdriver = true;

  delete navigator.webdriver;

  const originalNavigator = navigator;
  const navigatorHandler = {
    get(target, prop) {
      if (prop === 'webdriver') {
        return false;
      }
      return Reflect.get(target, prop);
    }
  };

  try {
    Object.defineProperty(window, 'navigator', {
      value: new Proxy(originalNavigator, navigatorHandler),
      writable: false,
      configurable: false
    });
  } catch (e) {
    Object.defineProperty(originalNavigator, 'webdriver', {
      get: () => false,
      enumerable: false,
      configurable: true
    });
  }
}
agentInfraDriver();
`;
