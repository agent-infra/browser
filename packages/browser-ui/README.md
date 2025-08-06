# browser-ui

A React component library for rendering and interacting with remote browser instances through Chrome DevTools Protocol (CDP).

## Overview

The `browser-ui` package provides a `BrowserCanvas` React component that allows you to display and interact with a remote browser session directly in your web application. It connects to browser instances via WebSocket using the Chrome DevTools Protocol and renders the browser viewport on an HTML canvas element.

**Key Features:**
- 🖥️ Real-time browser viewport rendering
- 🖱️ Mouse and keyboard interaction forwarding
- 📱 Responsive canvas scaling
- 🔌 WebSocket-based connection to remote browsers
- ⚡ Built on Puppeteer Core
- 🎯 TypeScript support

## Installation

```bash
npm install @agent-infra/browser-ui
# or
pnpm add @agent-infra/browser-ui
# or
yarn add @agent-infra/browser-ui
```

## Basic Usage

```tsx
import React from 'react';
import { BrowserCanvas } from '@agent-infra/browser-ui';

function App() {
  return (
    <div style={{ width: '100%', height: '600px', position: 'relative' }}>
      <BrowserCanvas
        wsEndpoint="ws://localhost:9222/devtools/browser"
        onReady={({ browser, page }) => {
          console.log('Browser connected!', { browser, page });
        }}
        onError={(error) => {
          console.error('Connection error:', error);
        }}
        onSessionEnd={() => {
          console.log('Session ended');
        }}
      />
    </div>
  );
}
```

## Advanced Usage

### Using CDP Endpoint

```tsx
import React, { useRef } from 'react';
import { BrowserCanvas, BrowserCanvasRef } from '@agent-infra/browser-ui';

function BrowserApp() {
  const canvasRef = useRef<BrowserCanvasRef>(null);

  const handleEndSession = () => {
    canvasRef.current?.endSession();
  };

  return (
    <div>
      <button onClick={handleEndSession}>End Session</button>
      <div style={{ width: '100%', height: '800px', position: 'relative' }}>
        <BrowserCanvas
          ref={canvasRef}
          cdpEndpoint="http://localhost:9222/json/version"
          defaultViewport={{
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1,
            hasTouch: false,
            isLandscape: true,
            isMobile: false,
          }}
          onReady={({ browser, page }) => {
            // Navigate to a website
            page.goto('https://example.com');
          }}
        />
      </div>
    </div>
  );
}
```

### Custom Styling

```tsx
<BrowserCanvas
  wsEndpoint="ws://localhost:9222/devtools/browser"
  style={{
    border: '2px solid #ccc',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  }}
/>
```

## API Reference

### BrowserCanvasProps

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `cdpEndpoint` | `string` | No | CDP endpoint URL (higher priority than wsEndpoint) |
| `wsEndpoint` | `string` | No* | WebSocket endpoint URL |
| `defaultViewport` | `Viewport` | No | Initial viewport configuration |
| `onReady` | `(ctx: {browser: Browser, page: Page}) => void` | No | Callback when connection is established |
| `onError` | `(error: Error) => void` | No | Error callback |
| `onSessionEnd` | `() => void` | No | Callback when session ends |
| `style` | `React.CSSProperties` | No | Custom canvas styles |

*Either `cdpEndpoint` or `wsEndpoint` is required.

### BrowserCanvasRef

The component exposes the following methods and properties through ref:

```tsx
interface BrowserCanvasRef {
  browser: Browser | null;    // Puppeteer Browser instance
  page: Page | null;         // Puppeteer Page instance  
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
  isMobile: false,
};
```

## Connection Methods

### Method 1: Direct WebSocket Connection

```tsx
<BrowserCanvas wsEndpoint="ws://localhost:9222/devtools/browser/[target-id]" />
```

### Method 2: CDP Endpoint (Recommended)

```tsx
<BrowserCanvas cdpEndpoint="http://localhost:9222/json/version" />
```

The CDP endpoint method automatically:
- Fetches the WebSocket URL from the CDP endpoint
- Handles protocol switching (ws/wss based on your site's protocol)
- Merges query parameters from the CDP URL

## Browser Setup

To use this component, you need a Chrome/Chromium browser running with remote debugging enabled:

```bash
# Start Chrome with remote debugging
google-chrome --remote-debugging-port=9222 --disable-web-security

# Or using Docker
docker run -p 9222:9222 browserless/chrome
```

## Features in Detail

### Interactive Canvas
- **Mouse Events**: Click, move, scroll - all forwarded to the remote browser
- **Keyboard Events**: Full keyboard support including special keys
- **Responsive Scaling**: Canvas automatically scales to fit container while maintaining aspect ratio

### Error Handling
- Connection errors are captured and reported via `onError` callback
- Automatic reconnection handling for dropped connections
- Graceful cleanup on component unmount

### Performance
- Efficient screencast rendering using JPEG compression
- Optimized event handling to prevent unnecessary re-renders
- Memory leak prevention through proper cleanup

## Requirements

- React 16.8+ (hooks support)
- Modern browser with Canvas API support
- Access to a Chrome/Chromium instance with remote debugging enabled

## TypeScript Support

This package is written in TypeScript and includes full type definitions. You can import types for enhanced development experience:

```tsx
import type { Browser, Page, BrowserCanvasProps, BrowserCanvasRef } from '@agent-infra/browser-ui';
```

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
