/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ValidateResult {
  ignored: boolean;
  url: string;
  message?: string;
}

const BlockedProtocols = ['chrome:', 'chrome-extension:', 'devtools:'];

export function validateNavigationUrl(rawUrl: string): ValidateResult {
  const original = (rawUrl || '').trim();

  if (!original) {
    return {
      ignored: true,
      url: original,
      message: `Empty URL is ignored.`,
    };
  }

  if (original.toLowerCase().startsWith('chrome://newtab')) {
    return { ignored: false, url: original };
  }

  // parse and normalize URL
  let candidate = original;
  let protocol: string;
  try {
    const parsed = new URL(candidate);
    protocol = parsed.protocol;
  } catch (e) {
    candidate = `https://${candidate}`; // try https as default
    protocol = 'https:';
  }

  // BlockedProtocols check
  if (BlockedProtocols.includes(protocol)) {
    return {
      ignored: true,
      url: candidate,
      message: `The URL "${rawUrl}" is ignored because it uses the "${protocol}" protocol which accesses internal resources and may be dangerous.`,
    };
  }

  return { ignored: false, url: candidate };
}
