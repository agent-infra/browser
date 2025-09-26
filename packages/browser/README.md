# puppeteer-enhance

A powerful enhancement library for Puppeteer that provides advanced hotkey simulation capabilities with cross-platform support and browser-specific optimizations.

## Installation

```bash
npm install @agent-infra/puppeteer-enhance
# or
pnpm install @agent-infra/puppeteer-enhance
```

## Quick Start

```typescript
import { Hotkey } from '@agent-infra/puppeteer-enhance';
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch();
const page = await browser.newPage();

// Initialize hotkey handler
const hotkey = new Hotkey({ osName: 'macOS', browserName: 'chrome' });

// Simulate Ctrl+C (Copy)
await hotkey.press(page, 'ctrl+c');

// Simulate Cmd+V (Paste on macOS)
await hotkey.press(page, 'cmd+v');

// With custom delay
await hotkey.press(page, 'ctrl+a', { delay: 200 });
```

## API Reference

### Env

#### Methods: getEnvInfo

Automatically detect the operating system and browser type from a Puppeteer browser instance.

```typescript
import type { Browser } from 'puppeteer-core';

export type OSType = 'Windows' | 'macOS' | 'Linux' | 'Unknown';
export type BrowserType = 'Chrome' | 'Edge' | 'Firefox' | 'Unknown';

export interface EnvInfo {
  osName: OSType;
  browserName: BrowserType;
}

export async function getEnvInfo(browser: Browser): Promise<EnvInfo>
```

### Hotkey

#### Constructor

```typescript
export type OSType = 'Windows' | 'macOS' | 'Linux' | 'Unknown';
export type BrowserType = 'Chrome' | 'Edge' | 'Firefox' | 'Unknown';

new Hotkey(
  envInfo: { osName: OSType; browserName: BrowserType },
  logger?: Logger
)
```

#### Methods

**press(page, hotkey, options?)**

Simulate a hotkey press on the given page.

```typescript
import type { Page } from "puppeteer-core";

export interface HotkeyOptions {
  delay: number; // default 100ms
}

await hotkey.press(
  page: Page,
  hotkey: string,
  options?: HotkeyOptions
): Promise<void>
```

#### macOS + Chrome Optimization

When running on macOS with Chrome, the library automatically uses Chrome DevTools Protocol (CDP) commands for common system hotkeys:

> See the reasoning behind using CDP for simulation [#560](https://github.com/bytedance/UI-TARS-desktop/pull/560)

| Hotkey | Action |
|--------|--------|
| `Cmd+A` | Select All |
| `Cmd+X` | Cut |
| `Cmd+C` | Copy |
| `Cmd+V` | Paste |
| `Cmd+Z` | Undo |
| `Cmd+Y` / `Cmd+Shift+Z` | Redo |

#### Error Handling

```typescript
try {
  await hotkey.press(page, 'invalid+key');
} catch (error) {
  console.error('Unsupported key combination:', error.message);
}
```

## License

Apache License 2.0.

## Credits

Special thanks to the open source projects that inspired this toolkit:

- [puppeteer](https://github.com/puppeteer/puppeteer) - The underlying browser automation library
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) - Chrome DevTools Protocol
