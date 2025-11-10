<div align="right">
  <a href="README.zh-CN.md">简体中文</a> | <b>English</b>
</div>

# @agent-infra/browser-ui

**@agent-infra/browser-ui** is a CDP-based browser remote casting solution. It implements basic capability encapsulation based on **@agent-infra/browser** and can be directly referenced as a Web component by web pages.

Users only need to provide a CDP WebSocket URL with permissions, and **@agent-infra/browser-ui** can display the remote browser's page, and you can also manually intervene in browser operations, which is very useful in scenarios without VNC and headless browser.

<div align="center">
  <video src="https://github.com/user-attachments/assets/7394eccc-0d07-4764-8265-aa5b4b56d5f7" controls width="600"></video>
</div>

## Installation

```bash
npm install @agent-infra/browser-ui
```

## Quick Start

Usage in FE projects:

```typescript
import { BrowserUI } from '@agent-infra/browser-ui';

const container = document.getElementById('browserContainer');
if (!container) {
  throw new Error('Browser container element not found');
}

BrowserUI.create({
  root: container,
  browserOptions: {
    connect: {
      browserWSEndpoint: 'https://example.com/ws/url',
    },
  },
});
```

Or use the unpkg CDN to use it on any webpage:

- **CDN URL**: https://unpkg.com/@agent-infra/browser/dist/bundle/index.js

```html
<!doctype html>
<html lang="en">
  <body>
    <div id="browserContainer"></div>
    <script src="https://unpkg.com/@agent-infra/browser/dist/bundle/index.js"></script>
    <script>
      const BrowserUI = window.agent_infra_browser_ui.BrowserUI;

      BrowserUI.create({
        root: document.getElementById('browserContainer'),
        browserOptions: {
          connect: {
            // @ts-ignore
            browserWSEndpoint: 'https://example.com/ws/url',
          },
        },
      });
    </script>
  </body>
</html>
```

A complete usable example, which can be run directly with `npm run dev` in the current directory or viewed in the `/examples` directory within the package.

## Features

For detailed documentation on all features, please refer to our [complete documentation](https://github.com/agent-infra/browser/blob/main/docs/browser-ui.md).

- **Tab Switching** - Display all tabs and implement `switchTab`/`createTab`/`closeTab` functions
- **Navigation** - Basic functions like `goBack`/`goForward`/`reload`/`goto`
- **Dialog** - Real-time display and response to blocking popups like `Alert`/`Confirm`
- **Mouse Input** - Support for `move`/`hover`/`click`/`drag` operations
- **Keyboard Input** - Full keyboard support including common hotkeys
- **Clipboard Simulation** - Simulated clipboard functionality for copy-paste operations

## Requirements

- Node.js >= 20.x
- Chrome/Chromium browser with remote debugging support
- Network access to CDP WebSocket endpoint

## License

Apache License 2.0.

## Credits

Special thanks to the open source projects that inspired this toolkit:

- [puppeteer](https://github.com/puppeteer/puppeteer) - The underlying browser automation library
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) - Chrome DevTools Protocol
- [Lit](https://lit.dev/) - Simple. Fast. Web Components.
- [Lucide icons](https://lucide.dev/) - Beautiful & consistent icons
