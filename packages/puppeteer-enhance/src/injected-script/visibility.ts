/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

// install "es6-string-html" vscode Extensions to highlight string code

export const visibilityScript = /* javascript */ `
function agentInfraVisibilityScript() {
  if (window.top !== window) {
    return;
  }
  if (window.__agent_infra_visibility_initialized) {
    return;
  }

  console.log('injectedScript');

  const handleVisibilityChange = () => {
    const isVisible = document.visibilityState === 'visible';
    if (typeof window.__agent_infra_visibility_change === 'function') {
      window.__agent_infra_visibility_change(isVisible);
    }
  }

  window.__agent_infra_visibility_initialized = true;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleVisibilityChange);
  } else {
    handleVisibilityChange();
  }

  document.addEventListener('visibilitychange', handleVisibilityChange);
}
agentInfraVisibilityScript();
`;
