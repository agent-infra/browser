<div align="right">
  <a href="README.zh-CN.md">简体中文</a> | <b>English</b>
</div>

# @agent-infra/browser

**@agent-infra/browser** is an SDK based on **puppeteer** specifically designed to provide foundational functionality for browser agents. It provides high-level abstractions for tab management, dialog handling, hotkey support, and more while maintaining simple and intuitive APIs.

## Installation

```bash
npm install @agent-infra/browser
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

## Complete Documentation

For detailed API documentation and advanced usage examples, please refer to our [complete documentation](../../docs/browser.md).

## License

Apache License 2.0.

## Credits

Special thanks to the open source projects that inspired this toolkit:

- [puppeteer](https://github.com/puppeteer/puppeteer) - The underlying browser automation library
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) - Chrome DevTools Protocol
