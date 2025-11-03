# @agent-infra/browser

**@agent-infra/browser** is an SDK based on **puppeteer** specifically designed to provide foundational functionality for browser agents. It provides high-level abstractions for tab management, dialog handling, hotkey support, and more while maintaining simple and intuitive APIs.

## Installation

```bash
npm install @agent-infra/browser
# or
pnpm install @agent-infra/browser
```

## Quick Start

Here is a simple usage demo. Browser will find the Chrome or Edge browser installed on your computer, launch a controlled browser instance, and then execute some operations through CDP control.

```typescript
import { Browser } from '@agent-infra/browser';

// Create browser instance
const browser = await Browser.create();

// Set User-Agent (optional)
browser.setUserAgent({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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

## Key Features

- **Tab Management** - Create, switch, and close browser tabs
- **Navigation Control** - Go forward, back, reload, and navigate to URLs
- **Mouse & Keyboard Operations** - Vision-based mouse control and enhanced keyboard input with hotkey support
- **Dialog Handling** - Automatic detection and handling of browser dialogs (alert, confirm, prompt, beforeunload)
- **Cookie Management** - Full cookie manipulation capabilities
- **Cross-platform Support** - Works on Windows, macOS, and Linux

## Usage Examples

### Tab Management

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

### Mouse and Keyboard Operations

```typescript
const tab = browser.getActiveTab();

// Mouse click
const clickResult = await tab.mouse.vision.click(100, 200);
if (clickResult.success) {
  console.log('Click successful');
} else {
  console.error('Click failed:', clickResult.message);
}

// Keyboard input
const typeResult = await tab.keyboard.type('Hello World');
if (typeResult.success) {
  console.log('Type successful');
}

// Keyboard hotkey
const copyResult = await tab.keyboard.press('ctrl+c'); // Copy
```

### Dialog Handling

```typescript
const result = await tab.keyboard.press('ctrl+c');

if (!result.success) {
  console.log('Operation blocked:', result.message);

  // Get dialog information
  const dialog = result.detail;
  console.log('Dialog type:', dialog.type);

  // Handle based on dialog type
  switch (dialog.type) {
    case 'alert':
      await tab.dialog.accept();
      break;
    case 'confirm':
      await tab.dialog.accept(); // or await tab.dialog.dismiss();
      break;
  }
}
```

## Complete Documentation

For detailed API documentation and advanced usage examples, please refer to our [complete documentation](../../docs/browser.md).

## License

Apache License 2.0.

## Credits

Special thanks to the open source projects that inspired this toolkit:

- [puppeteer](https://github.com/puppeteer/puppeteer) - The underlying browser automation library
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) - Chrome DevTools Protocol
