# Browser UI

A React component library that provides remote browser interaction capabilities. This package allows you to display and interact with a remote browser instance through Chrome DevTools Protocol (CDP) in your React application.

## What is this package for?

This package enables you to:

- Display a remote browser's page content in a React component
- Interact with the remote browser (mouse clicks, keyboard input, scrolling)
- Control browser instances programmatically through Puppeteer
- Build browser automation tools with visual feedback
- Create remote browser viewers or testing interfaces

The main component `BrowserCanvas` renders the browser content on an HTML5 canvas and forwards user interactions to the remote browser via CDP WebSocket connection.


## Installation

```bash
npm install @agent-infra/browser-ui
```

## Quick Start

### 1. Start a browser with remote debugging

First, you need a Chrome/Chromium browser running with remote debugging enabled:

```javascript
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/path/to/chrome',
  headless: false,
  args: []
});

console.log('WebSocket endpoint:', browser.wsEndpoint());
```

### 2. Use BrowserCanvas in your React app

```tsx
import React, { useRef } from 'react';
import { BrowserCanvas, BrowserCanvasRef, Browser, Page } from '@agent-infra/browser-ui';

function App() {
  const canvasRef = useRef<BrowserCanvasRef>(null);

  const handleReady = ({ browser, page }: { browser: Browser; page: Page }) => {
    console.log('Browser connected, current URL:', page.url());
    
    // Listen for navigation events
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        console.log('Navigated to:', frame.url());
      }
    });
  };

  const handleError = (error: Error) => {
    console.error('Browser connection error:', error);
  };

  return (
    <div style={{ width: '100%', height: '800px', position: 'relative' }}>
      <BrowserCanvas
        ref={canvasRef}
        wsEndpoint="ws://127.0.0.1:9222/devtools/browser/YOUR_BROWSER_ID"
        onReady={handleReady}
        onError={handleError}
        onSessionEnd={() => console.log('Session ended')}
      />
    </div>
  );
}
```

## API Reference

### BrowserCanvas Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `wsEndpoint` | `string` | No* | CDP WebSocket URL for browser connection |
| `cdpEndpoint` | `string` | No* | CDP HTTP endpoint (higher priority than wsEndpoint) |
| `onReady` | `(ctx: {browser: Browser, page: Page}) => void` | No | Callback when browser connection is established |
| `onError` | `(error: Error) => void` | No | Error callback for connection/runtime errors |
| `onSessionEnd` | `() => void` | No | Callback when browser session ends |
| `defaultViewport` | `Viewport` | No | Initial viewport configuration |
| `style` | `React.CSSProperties` | No | Custom CSS styles for the canvas |

*Either `wsEndpoint` or `cdpEndpoint` is required.

### BrowserCanvasRef

The ref object provides access to:

```tsx
interface BrowserCanvasRef {
  browser: Browser | null;    // Puppeteer browser instance
  page: Page | null;         // Current page instance  
  client: any;               // CDP client
  endSession: () => void;    // Manually end the session
}
```

### Default Viewport

```tsx
const defaultViewport = {
  width: 1280,
  height: 720,
  deviceScaleFactor: 1,
  hasTouch: false,
  isLandscape: true,
  isMobile: false
};
```

## Advanced Usage

### Using CDP Endpoint

Instead of providing the WebSocket URL directly, you can use the CDP HTTP endpoint:

```tsx
<BrowserCanvas
  cdpEndpoint="http://127.0.0.1:9222/json/version"
  onReady={handleReady}
/>
```

The component will automatically fetch the WebSocket URL from the CDP endpoint.


## How It Works

1. **Connection**: The component connects to a remote browser via CDP WebSocket
2. **Screencast**: Uses CDP's `Page.startScreencast` to receive live screenshots
3. **Rendering**: Screenshots are rendered on an HTML5 canvas element
4. **Interaction**: Mouse and keyboard events are captured and forwarded via CDP's `Input.dispatchMouseEvent` and `Input.dispatchKeyEvent`
5. **Scaling**: The canvas automatically scales to fit its container while maintaining aspect ratio

## Browser Setup Examples

### Using Puppeteer (Recommended)

```javascript
import puppeteer from 'puppeteer-core';

async function startBrowser() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
    // executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
    // executablePath: '/usr/bin/google-chrome', // Linux
    headless: false,
    args: [
      '--remote-debugging-port=9222',
      '--remote-debugging-address=0.0.0.0',
      '--disable-web-security',
      '--remote-allow-origins=*'
    ]
  });
  
  return browser.wsEndpoint();
}
```

### Manual Chrome Launch

```bash
# macOS/Linux
google-chrome --remote-debugging-port=9222 --remote-debugging-address=0.0.0.0 --disable-web-security --remote-allow-origins=*

# Windows
chrome.exe --remote-debugging-port=9222 --remote-debugging-address=0.0.0.0 --disable-web-security --remote-allow-origins=*
```

## Requirements

- Node.js >= 20.x
- React >= 16.8 (hooks support)
- Chrome/Chromium browser with remote debugging support
- Network access to CDP WebSocket endpoint

## License

Apache License 2.0.

## Credits

Special thanks to the open source projects that inspired this toolkit:

- [puppeteer](https://github.com/puppeteer/puppeteer) - The underlying browser automation library
