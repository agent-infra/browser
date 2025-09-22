# Browser Finder

A cross-platform browser path finder that helps you locate installed browsers on Windows, macOS, and Linux.

## Features

- 🔍 **Cross-platform support** - Works on Windows, macOS, and Linux
- 🌐 **Multiple browsers** - Supports Chrome, Edge, and Firefox
- 🔄 **Automatic fallback** - Finds any available browser when specific one isn't found
- 📝 **Built-in logging** - Comprehensive logging with customizable logger
- ⚡ **Fast detection** - Optimized for quick browser detection without expensive operations
- 🛡️ **Type-safe** - Written in TypeScript with full type definitions

## Installation

```bash
npm install @agent-infra/browser-finder
```

## Usage

### Basic Usage

```typescript
import { BrowserFinder } from '@agent-infra/browser-finder';

const finder = new BrowserFinder();

// Find any available browser (tries Chrome -> Edge -> Firefox)
const browser = finder.findBrowser();
console.log(browser.path); // "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
console.log(browser.type); // "chrome"
```

### Find Specific Browser

```typescript
import { BrowserFinder } from '@agent-infra/browser-finder';

const finder = new BrowserFinder();

// Find Chrome specifically
const chrome = finder.findBrowser('chrome');

// Find Edge specifically
const edge = finder.findBrowser('edge');

// Find Firefox specifically
const firefox = finder.findBrowser('firefox');
```

### Custom Logger

```typescript
import { BrowserFinder } from '@agent-infra/browser-finder';

const customLogger = {
  info: (msg: string, ...args: any[]) => console.log(`INFO: \${msg}`, ...args),
  warn: (msg: string, ...args: any[]) => console.warn(`WARN: \${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`ERROR: \${msg}`, ...args),
  // ... other logger methods
};

const finder = new BrowserFinder(customLogger);
const browser = finder.findBrowser();
```

## API Reference

### BrowserFinder

#### Constructor

`new BrowserFinder(logger?: Logger)`

- `logger` (optional): Custom logger instance. If not provided, uses the default logger.

#### Methods

##### findBrowser(name?: BrowserType)

Finds a browser and returns its path and type.

**Parameters:**
- `name` (optional): Specific browser to find (`'chrome'` | `'edge'` | `'firefox'`)

**Returns:**
```typescript
{
  path: string;    // Full path to browser executable
  type: BrowserType; // Browser type ('chrome' | 'edge' | 'firefox')
}
```

**Examples:**
```typescript
// Find any browser (automatic fallback)
const anyBrowser = finder.findBrowser();

// Find specific browser
const chrome = finder.findBrowser('chrome');
const edge = finder.findBrowser('edge');
const firefox = finder.findBrowser('firefox');
```

## Supported Browsers

### Chrome
- **Windows**: Chrome, Chrome Beta, Chrome Dev, Chrome Canary
- **macOS**: Google Chrome, Google Chrome Beta, Google Chrome Dev, Google Chrome Canary
- **Linux**: google-chrome-stable, google-chrome, google-chrome-beta, google-chrome-dev, chromium-browser, chromium

### Edge
- **Windows**: Edge, Edge Beta, Edge Dev, Edge Canary
- **macOS**: Edge, Edge Beta, Edge Dev, Edge Canary
- **Linux**: microsoft-edge-stable, microsoft-edge-beta, microsoft-edge-dev

### Firefox
- **Windows**: Mozilla Firefox, Firefox Developer Edition, Firefox Nightly
- **macOS**: Firefox, Firefox Developer Edition, Firefox Nightly
- **Linux**: firefox (all editions use same binary name)

## Error Handling

The library throws descriptive errors when browsers cannot be found:

```typescript
try {
  const browser = finder.findBrowser('chrome');
} catch (error) {
  if (error.name === 'ChromePathsError') {
    console.log('Chrome not found on this system');
  }
}
```

### Error Types

- `ChromePathsError` - Chrome browser not found
- `EdgePathsError` - Edge browser not found (from edge-paths package)
- `FirefoxPathsError` - Firefox browser not found
- `BrowserPathsError` - No browser found when using automatic detection

## Platform Support

- **Windows** (win32) - ✅ Supported
- **macOS** (darwin) - ✅ Supported
- **Linux** - ✅ Supported
- Other platforms - ❌ Will throw "Unsupported platform" error

## Performance Notes

This library is optimized for fast browser detection:

- **macOS**: Avoids expensive `lsregister -dump` operations used by some other libraries
- **Linux**: Uses `which` command for quick binary lookup
- **Windows**: Efficiently checks common installation directories

## Dependencies

- `which` - Cross-platform executable finder
- `edge-paths` - Edge browser path detection
- `@agent-infra/logger` - Logging functionality

## License

Apache License 2.0.

## Credits

Special thanks to the open source projects that inspired this toolkit:

- [edge-paths](https://github.com/shirshak55/edge-paths) - Edge browser path finder
- [chrome-finder](https://github.com/gwuhaolin/chrome-finder) - Alternative Chrome finder
- [find-chrome-bin](https://github.com/mbalabash/find-chrome-bin) - Another Chrome finder

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history.
