<div align="right">
  <a href="browser.zh-CN.md">简体中文</a> | <b>English</b>
</div>

# Introduction

**@agent-infra/browser** is an SDK based on **puppeteer** specifically designed to provide foundational functionality for Browser Agent.

**puppeteer** is an excellent browser automation control software that encapsulates many CDP operations and provides a very concise set of APIs for users. However, when building Browser Agent based on **puppeteer**, you'll find it lacks some higher-level and common abstractions, such as tab management, dialog state management, hotkey support, etc.

**@agent-infra/browser** was created to address these pain points. Its APIs maintain simplicity while being very intuitive for browser operations, allowing you to quickly build a Browser GUI Agent, a Browser screen casting component, or a Browser-MCP.

<br />

# Quick Start

## Installation

```bash
npm install @agent-infra/browser
```

<br />

## Basic Usage

Here is a simple usage demo. Browser will find the Chrome or Edge browser installed on your computer, launch a controlled browser instance, and then execute some operations through CDP control.

```typescript
import { Browser } from '@agent-infra/browser';

// Create browser instance
const browser = await Browser.create();

// Set User-Agent (optional)
browser.setUserAgent({
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
});

// Get current active tab
const activeTab = browser.getActiveTab();

// Navigate to specified webpage
await activeTab.goto('https://example.com');

// Take screenshot
const screenshot = await activeTab.screenshot();

// Close browser
await browser.close();
```

<br />

## Tab Management

Unlike puppeteer, **@agent-infra/browser** abstracts a tab concept and provides related APIs to manage it.

```typescript
// Create new tab
const newTabId = await browser.createTab();

// Get all tabs snapshot
const tabsSnapshot = browser.getTabsSnapshot();

// Switch to specified tab
await browser.activeTab(tabId);

// Close tab
await browser.closeTab(tabId);
```

<br />

## Tab Navigation

For activeTab, users can perform navigation operations through related APIs.

```typescript
const tab = browser.getActiveTab();

// Navigate
await tab.goto('https://example.com');

// Forward
await tab.goForward();

// Back
await tab.goBack();

// Refresh
await tab.reload();
```

<br />

## Mouse and Keyboard Operations

For mouse operations, **@agent-infra/browser** currently encapsulates a vision solution (i.e., executing related actions through coordinates). We will support DOM-based solutions in the future.

For keyboard operations, we have built-in common hotkey support (such as copy/paste) on top of puppeteer's original functionality. Users can use them directly.

```typescript
const tab = browser.getActiveTab();

// Mouse click
const clickResult = await tab.mouse.vision.click(100, 200);
if (clickResult.success) {
  console.log('Click successful');
} else {
  console.error('Click failed:', clickResult.message);
  console.log('Dialog info:', clickResult.detail);
}

// Mouse move
const moveResult = await tab.mouse.vision.move(150, 250);
if (moveResult.success) {
  console.log('Move successful');
} else {
  console.error('Move failed:', moveResult.message);
}

// Mouse scroll
const scrollResult = await tab.mouse.vision.scroll('down', 300);
if (scrollResult.success) {
  console.log('Scroll successful');
}

// Keyboard input
const typeResult = await tab.keyboard.type('Hello World');
if (typeResult.success) {
  console.log('Type successful');
}

// Keyboard hotkey
const copyResult = await tab.keyboard.press('ctrl+c'); // Copy
if (copyResult.success) {
  console.log('Copy successful');
}

const pasteResult = await tab.keyboard.press('ctrl+v'); // Paste
if (pasteResult.success) {
  console.log('Paste successful');
}
```

<br />

## Dialog Handling

When dialogs (alert, confirm, prompt, beforeunload) appear on the page, mouse and keyboard operations will be blocked. In this case, the operation methods will return failure responses containing error messages and dialog details.

Dialog types are as follows:

```typescript
interface DialogMeta {
  type: 'alert' | 'confirm' | 'prompt' | 'beforeunload';
  message: string;
  defaultValue: string;
}
```

Here is an example of handling dialogs:

```typescript
const tab = browser.getActiveTab();

// Try to execute keyboard operation
const result = await tab.keyboard.press('ctrl+c');

if (!result.success) {
  console.log('Operation blocked:', result.message);

  // Get dialog information
  const dialog = result.detail;
  console.log('Dialog type:', dialog.type);
  console.log('Dialog message:', dialog.message);

  // Handle based on dialog type
  switch (dialog.type) {
    case 'alert':
      // Accept alert dialog
      await tab.dialog.accept();
      break;
    case 'confirm':
      // Accept or dismiss confirm dialog
      await tab.dialog.accept(); // or await tab.dialog.dismiss();
      break;
    case 'prompt':
      // Input text and accept prompt dialog
      await tab.dialog.accept('User input text');
      break;
    case 'beforeunload':
      // Handle page leave confirmation
      await tab.dialog.accept(); // or await tab.dialog.dismiss();
      break;
  }

  // After dialog handling, you can retry the operation
  const retryResult = await tab.keyboard.press('ctrl+c');
  if (retryResult.success) {
    console.log('Retry operation successful');
  }
}
```

<br />

## Cookie Management

For cookie operations, we maintain the same API as puppeteer. For more detailed usage, please refer to [Cookies|Puppeteer](https://pptr.dev/guides/cookies).

```typescript
// Get all cookies
const cookies = await browser.cookies();

// Set cookie
await browser.setCookie({
  name: 'session',
  value: 'abc123',
  domain: 'example.com',
});

// Delete cookie
await browser.deleteCookie({ name: 'session', domain: 'example.com' });

// Batch delete matching cookies
await browser.deleteMatchingCookies({ domain: 'example.com' });
```

<br />

# API

## Browser Class

The main browser class, primarily providing tab management and cookie injection functionality.

<br />

### Lifecycle

#### `Browser.create(options?: { launchOrConnect: LaunchOptions }): Promise<Browser>`

Create and initialize browser instance. LaunchOptions is puppeteer's [launch parameter type](https://pptr.dev/browsers-api/browsers.launchoptions), but with some differences:

> puppeteer can control Chrome's startup behavior through the `args` parameter in [`puppeteer.launch`](https://pptr.dev/api/puppeteer.launchoptions). For specific logic and parameters, please refer to the source code [puppeteer - ChromeLauncher.ts](https://github.com/puppeteer/puppeteer/blob/main/packages/puppeteer-core/src/node/ChromeLauncher.ts).

1. In addition to puppeteer-core's built-in parameters, calling `Browser.create` also adds the following parameters by default to optimize the browser usage experience:

| Parameter                                                       | Description                                                           |
| --------------------------------------------------------------- | --------------------------------------------------------------------- |
| `--mute-audio`                                                  | Mute any audio                                                        |
| `--no-default-browser-check`                                    | Disable default browser check, don't prompt to set as default browser |
| `--ash-no-nudges`                                               | Avoid blue bubble "user education" prompts                            |
| `--window-size=defaultViewport.width,defaultViewport.height+90` | Set initial window size.                                              |

<br />

2. The following puppeteer-core parameters are ignored by default:

| Parameter             | Description                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `--enable-automation` | Avoid showing "Chrome is being controlled by automation software" prompt when browser starts |

<br />

3. The default ViewPort is set to `{ width: 1280, height: 1024 }` to maintain consistency with AIO Sandbox's default browser size.

#### `disconnect(): Promise<void>`

Disconnect browser connection (without closing browser process).

#### `close(): Promise<void>`

Destroy Browser instance and close the launched browser process.

<br />

### Meta Information

#### `getBrowserMetaInfo(): Promise<object>`

Get browser meta information, return type as follows:

```typescript
import type { Viewport } from 'puppeteer-core';

interface BrowserMetaInfo {
  envInfo: EnvInfo;
  userAgent: string;
  viewport: Viewport;
  wsEndpoint: string;
}

interface EnvInfo {
  osName: 'Windows' | 'macOS' | 'Linux' | 'Unknown';
  browserName: 'Chrome' | 'Edge' | 'Firefox' | 'Unknown';
  browserVersion: string;
}
```

<br />

### Tabs Management

#### `close(): Promise<void>`

Close browser and clean up all resources.

#### `getActiveTab(): Tab | null`

Get current active tab.

#### `createTab(): Promise<string>`

Create new tab and return tab ID.

#### `activeTab(tabId: string): Promise<boolean>`

Switch to specified tab.

#### `closeTab(tabId: string): Promise<boolean>`

Close specified tab.

#### `getTabsSnapshot(): TabsState`

Get current state snapshot of all tabs.

```typescript
interface TabsState {
  tabs: Map<string, TabMeta>;
  activeTabId: string | null;
}

interface TabMeta {
  id: string;
  title: string;
  url: string;
  favicon: string | null;
  isLoading: boolean;
  isActive: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  dialog?: DialogMeta;
}

interface DialogMeta {
  type: 'alert' | 'confirm' | 'prompt' | 'beforeunload';
  message: string;
  defaultValue: string;
}
```

#### `subscribeTabChange(callback: () => void): () => void`

Subscribe to tab change events, returns unsubscribe function. You can achieve real-time monitoring of tab changes through `subscribeTabChange` and `getTabsSnapshot`.

<br />

### Cookies Management

#### `cookies(): Promise<Cookie[]>`

Get all cookies. You can directly refer to [Browser.cookies | Puppeteer](https://pptr.dev/api/puppeteer.browser.cookies).

#### `setCookie(...cookies: CookieData[]): Promise<void>`

Set one or more cookies. You can directly refer to [Browser.setcookie | Puppeteer](https://pptr.dev/api/puppeteer.browser.setcookie).

#### `deleteCookie(...cookies: Cookie[]): Promise<void>`

Delete one or more cookies. You can directly refer to [Browser.deletecookie | Puppeteer](https://pptr.dev/api/puppeteer.browser.deletecookie).

#### `deleteMatchingCookies(...filters: DeleteCookiesRequest[]): Promise<void>`

Batch delete cookies matching specified conditions. You can directly refer to [Browser.deleteMatchingCookies | Puppeteer](https://pptr.dev/api/puppeteer.browser.deleteMatchingCookies).

<br />

### UserAgent Management

#### `setUserAgent(options: UserAgentInfo): void`

Set browser's User-Agent. This setting will affect the browser itself and all subsequently created tabs.

**Parameter Type:**

```typescript
interface UserAgentInfo {
  userAgent?: string;
  userAgentMetadata?: Protocol.Emulation.UserAgentMetadata;
  platform?: string;
}
```

**Usage Example:**

```typescript
// Set simple User-Agent string
browser.setUserAgent({
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
});
```

#### `getUserAgent(): Promise<UserAgentInfo>`

Get current browser's User-Agent information.

**Return Value:**

- If previously set through `setUserAgent`, returns the set UserAgentInfo
- Otherwise returns the current User-Agent string obtained from the browser

<br />

## Tab Class

Tab class providing page-level operation functionality.

### Navigation

Navigation methods now return `NavigationResult` type to provide detailed information about navigation success or failure.

**Return Type:**

```typescript
interface NavigationResult {
  success: true;
  url: string;
} | {
  success: false;
  url: string;
  message: string;
}
```

#### `goto(url: string, options?: NavigationOptions): Promise<NavigationResult>`

Navigate to specified URL. You can directly refer to [Page.goto | Puppeteer](https://pptr.dev/api/puppeteer.page.goto).

#### `goBack(options?: NavigationOptions): Promise<NavigationResult>`

Navigate to previous page. You can directly refer to [Page.goBack | Puppeteer](https://pptr.dev/api/puppeteer.page.goBack).

#### `goForward(options?: NavigationOptions): Promise<NavigationResult>`

Navigate to next page. You can directly refer to [Page.goForward | Puppeteer](https://pptr.dev/api/puppeteer.page.goForward).

#### `reload(options?: NavigationOptions): Promise<NavigationResult>`

Reload current page. You can directly refer to [Page.reload | Puppeteer](https://pptr.dev/api/puppeteer.page.reload).

#### `getHistory(): Promise<NavigationHistory>`

Get navigation history of the tab.

**Return Type:**

```typescript
interface NavigationHistory {
  index: number;
  canGoBack: boolean;
  canGoForward: boolean;
  history: Array<{
    url: string;
    title: string;
  }>;
}
```

<br />

### Keyboard Control

Keyboard operation methods now return `ActionResult` type to handle cases where dialog blocks operations.

#### `press(key: KeyOrHotKeyInput, options?: KeyboardOptions): Promise<ActionResult>`

Press and release key or key combination.

Key combinations are similar to `Ctrl+C`, `Ctrl+V`, type is `string`, individual keys are connected with `+`. No need to deliberately distinguish between operating systems (for example, for the copy hotkey, Win/Linux uses `Ctrl`, macOS uses `Command`), internal adaptation has been handled.

**Return Type:**

```typescript
interface ActionResult {
  success: true;
} | {
  success: false;
  message: string;
  detail: DialogMetaInfo;
}
```

#### `down(key: KeyOrHotKeyInput, options?: KeyboardOptions): Promise<ActionResult>`

Press key (without releasing). You can refer to [Keyboard.down | Puppeteer](https://pptr.dev/api/puppeteer.keyboard.down).

#### `up(key: KeyOrHotKeyInput): Promise<ActionResult>`

Release key. You can refer to [Keyboard.up | Puppeteer](https://pptr.dev/api/puppeteer.keyboard.up).

#### `type(text: string, options?: KeyboardOptions): Promise<ActionResult>`

Input text. You can refer to [Keyboard.type | Puppeteer](https://pptr.dev/api/puppeteer.keyboard.type).

<br />

### Mouse Control (Vision)

Mouse operation methods now return `ActionResult` type to handle cases where dialog blocks operations.

**Return Type:**

```typescript
interface ActionResult {
  success: true;
} | {
  success: false;
  message: string;
  detail: DialogMetaInfo;
}
```

#### `click(x: number, y: number, options?: MouseClickOptions): Promise<ActionResult>`

Click mouse at specified coordinates. You can directly refer to [Mouse.click | Puppeteer](https://pptr.dev/api/puppeteer.mouse.click).

#### `move(x: number, y: number, options?: MouseMoveOptions): Promise<ActionResult>`

Move mouse to specified coordinates. You can directly refer to [Mouse.move | Puppeteer](https://pptr.dev/api/puppeteer.mouse.move).

#### `drag(start: Point, end: Point, options?: object): Promise<ActionResult>`

Drag operation. You can directly refer to [Mouse.dragAndDrop | Puppeteer](https://pptr.dev/api/puppeteer.mouse.dragAndDrop).

#### `scroll(direction: ScrollDirection, delta: number): Promise<ActionResult>`

Scroll page.

**Scroll Direction:**

```typescript
type ScrollDirection = 'up' | 'down' | 'left' | 'right';
```

<br />

### Screenshot

#### `screenshot<T extends TabScreenshotOptions>(options?: T): Promise<TabScreenshotResult<T>>`

Take page screenshot.

```typescript
interface TabScreenshotOptions {
  type?: 'png' | 'jpeg';
  quality?: number;
  fullPage?: boolean;
  path?: string;
}

interface BaseScreenshotResult {
  type: string;
  width: number;
  height: number;
}

interface ScreenshotResultWithPath extends BaseScreenshotResult {
  data: Uint8Array; // Binary data
}

interface ScreenshotResultWithoutPath extends BaseScreenshotResult {
  data: string; // Base64 data
}
```
