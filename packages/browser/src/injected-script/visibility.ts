/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

// install "es6-string-html" vscode Extensions to highlight string code

// https://developer.chrome.com/docs/web-platform/page-lifecycle-api

export const visibilityScript = /* javascript */ `
function agentInfraVisibilityScript() {
  if (window.__agent_infra_browser.visibility) {
    return;
  }
  window.__agent_infra_browser.visibility = true;

  if (window.top !== window) {
    return;
  }

  console.log('[agent-infra] visibility script injected');

  const handleVisibilityChange = () => {
    const isVisible = document.visibilityState === 'visible';
    if (typeof window.__agent_infra_visibility_change === 'function') {
      window.__agent_infra_visibility_change(isVisible);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleVisibilityChange);
  } else {
    handleVisibilityChange();
  }

  window.addEventListener('visibilitychange', handleVisibilityChange, { capture: true });
}
agentInfraVisibilityScript();
`;
