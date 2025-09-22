/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Browser } from 'puppeteer-core';
import type { OSType, BrowserType } from './types/env';

export interface EnvInfo {
  osName: OSType;
  browserName: BrowserType;
}

export async function getEnvInfo(browser: Browser): Promise<EnvInfo> {
  let osName: OSType = 'Unknown';
  let browserName: BrowserType = 'Unknown';

  try {
    // 1.get env info from CDP
    const client = await browser.target().createCDPSession();
    const systemInfo = await client.send('SystemInfo.getInfo');
    const browserVersion = await browser.version();

    await client.detach();

    if (systemInfo.modelName) {
      const modelName = systemInfo.modelName.toLowerCase();
      if (modelName.includes('win') || modelName.includes('surface')) {
        osName = 'Windows';
      } else if (modelName.includes('mac') || modelName.includes('darwin')) {
        osName = 'macOS';
      } else if (modelName.includes('linux')) {
        osName = 'Linux';
      }
    }

    const versionStr = browserVersion.toLowerCase();
    if (versionStr.includes('chrome')) {
      browserName = 'Chrome';
    } else if (versionStr.includes('edge') || versionStr.includes('edg')) {
      browserName = 'Edge';
    } else if (versionStr.includes('firefox')) {
      browserName = 'Firefox';
    }

    if (osName !== 'Unknown' && browserName !== 'Unknown') {
      return { osName, browserName };
    }
  } catch (error) {
    console.warn(
      'Failed to get environment info via CDP, falling back to userAgent',
    );
  }

  // 2.fallback: get env info from userAgent
  const userAgent = (await browser.userAgent()).toLowerCase();

  if (osName === 'Unknown') {
    if (
      userAgent.includes('windows') ||
      userAgent.includes('win32') ||
      userAgent.includes('win64')
    ) {
      osName = 'Windows';
    } else if (userAgent.includes('mac os x') || userAgent.includes('macos')) {
      osName = 'macOS';
    } else if (userAgent.includes('linux') && !userAgent.includes('android')) {
      osName = 'Linux';
    }
  }

  if (browserName === 'Unknown') {
    if (userAgent.includes('edg/') || userAgent.includes('edge/')) {
      browserName = 'Edge';
    } else if (userAgent.includes('chrome/') && !userAgent.includes('edg')) {
      browserName = 'Chrome';
    } else if (userAgent.includes('firefox/')) {
      browserName = 'Firefox';
    }
  }

  return { osName, browserName };
}
