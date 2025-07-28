export type OSType = 'Windows' | 'macOS' | 'Linux' | 'Android' | 'iOS' | 'Unknown';

export type BrowserType = 'chrome' | 'edge' | 'firefox' | 'Unknown';

export interface OSInfo {
  os: OSType;
  isNode: boolean;
  isBrowser: boolean;
  userAgent?: string;
  nodeVersion?: string;
}

export interface BrowserInfo {
  browser: BrowserType;
  isNode: boolean;
  isBrowser: boolean;
  userAgent?: string;
  version?: string;
}

export function detectOS(): OSInfo {
  const isNode = typeof window === 'undefined' && typeof process !== 'undefined';
  const isBrowser = typeof window !== 'undefined';

  let platform: OSType = 'Unknown';
  let userAgent: string | undefined;
  let nodeVersion: string | undefined;

  if (isNode) {
    const os = require('os');
    const nodePlatform = os.platform();
    nodeVersion = process.version;

    switch (nodePlatform) {
      case 'win32':
        platform = 'Windows';
        break;
      case 'darwin':
        platform = 'macOS';
        break;
      case 'linux':
        platform = 'Linux';
        break;
      default:
        platform = 'Unknown';
    }
  } else if (isBrowser) {
    userAgent = navigator.userAgent;
    const ua = userAgent.toLowerCase();

    if (ua.includes('windows') || ua.includes('win32') || ua.includes('win64')) {
      platform = 'Windows';
    } else if (ua.includes('mac os x') || ua.includes('macos')) {
      platform = 'macOS';
    } else if (ua.includes('linux') && !ua.includes('android')) {
      platform = 'Linux';
    } else if (ua.includes('android')) {
      platform = 'Android';
    } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
      platform = 'iOS';
    }
  }

  return {
    os: platform,
    isNode,
    isBrowser,
    userAgent,
    nodeVersion,
  };
}

export function detectBrowser(browserType?: BrowserType): BrowserInfo {
  const isNode = typeof window === 'undefined' && typeof process !== 'undefined';
  const isBrowser = typeof window !== 'undefined';

  let browser: BrowserType = 'Unknown';
  let userAgent: string | undefined;

  if (isNode) {
    browser = browserType || 'Unknown';
  } else if (isBrowser) {
    userAgent = navigator.userAgent;
    const ua = userAgent.toLowerCase();

    if (ua.includes('edg/') || ua.includes('edge/')) {
      browser = 'edge';
    } else if (ua.includes('chrome/') && !ua.includes('edg')) {
      browser = 'chrome';
    } else if (ua.includes('firefox/')) {
      browser = 'firefox';
    }
  }

  return {
    browser,
    isNode,
    isBrowser,
    userAgent,
  };
}