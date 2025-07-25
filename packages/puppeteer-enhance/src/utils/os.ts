export type OSPlatform = 'Windows' | 'macOS' | 'Linux' | 'Android' | 'iOS' | 'Unknown';

export interface OSInfo {
  platform: OSPlatform;
  isNode: boolean;
  isBrowser: boolean;
  userAgent?: string;
  nodeVersion?: string;
}

export function detectOS(): OSInfo {
  const isNode = typeof window === 'undefined' && typeof process !== 'undefined';
  const isBrowser = typeof window !== 'undefined';

  let platform: OSPlatform = 'Unknown';
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
    platform,
    isNode,
    isBrowser,
    userAgent,
    nodeVersion
  };
}

export function isWindows(): boolean {
  return detectOS().platform === 'Windows';
}

export function isMacOS(): boolean {
  return detectOS().platform === 'macOS';
}

export function isLinux(): boolean {
  return detectOS().platform === 'Linux';
}

export function isAndroid(): boolean {
  return detectOS().platform === 'Android';
}

export function isIOS(): boolean {
  return detectOS().platform === 'iOS';
}
