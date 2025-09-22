# Browser Agent Infra

Browser Agent Infra is dedicated to building a comprehensive browser infrastructure toolkit designed for AI agents and browser automation.

This monorepo provides a complete set of packages for browser detection, control and UI interaction —— everything you need to build intelligent browser automation systems.

Currently, the business users of this Infra include [UI-TARS-desktop](https://github.com/bytedance/UI-TARS-desktop/#ui-tars-desktop) and [Agent TARS](https://github.com/bytedance/UI-TARS-desktop/#agent-tars), with more agents or apps to be integrated in the future.

<br />

## What is this for?

This toolkit is specifically designed for:

- **AI Agents** that need to interact with web browsers
- **Browser Automation** tools and testing frameworks
- **Remote Browser Control** applications
- **Web Scraping** and data extraction systems
- **Cross-platform Browser** detection and management


## Architecture

![architecture](./docs/images/architecture.png)

## Packages Overview

### [@agent-infra/browser](./packages/browser)

**Core Browser Control Library**. A lightweight wrapper around Puppeteer that provides simplified browser management with support for both local and remote browser instances.


### [@agent-infra/browser-ui](./packages/browser-ui)

**Browser Interface Components**. UI components for displaying and interacting with remote browser instances through Chrome DevTools Protocol (CDP).


### [@agent-infra/puppeteer-enhance](./packages/puppeteer-enhance)

**Enhanced Puppeteer Features**. A collection of tools that enhance Puppeteer functionality, such as hotkey support and common injection scripts.


### [@agent-infra/browser-finder](./packages/browser-finder) 

**Cross-Platform Browser Detection**. Automatically locate installed browsers (Chrome, Edge, Firefox) on Windows, macOS, and Linux systems.


### [@agent-infra/browser-context](./packages/browser-context) 

**Smart Web Content Extraction**. Extract clean, readable content from web pages and convert to Markdown format with advanced algorithms and browser automation support.


### [@agent-infra/media-utils](./packages/media-utils)

**Media Processing Utilities**. Media tools for handling browser-related tasks, such as high-performance base64 image parsing and media resource processing.

<br />

## Development

This is a monorepo managed with **pnpm**. To get started:

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run tests
pnpm run test

# Lint code
pnpm run lint
```
<br />

## Requirements

- **Node.js** >= 20.x
- **pnpm** for package management
- **Chrome/Chromium** browser for browser automation features

<br />

## License

This project is licensed under the Apache License 2.0.

<br />

## Credits

Special thanks to the open source projects that inspired this toolkit:

- [puppeteer](https://github.com/puppeteer/puppeteer) - The underlying browser automation library
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) - Chrome DevTools Protocol
- [ChatWise](https://chatwise.app/) - Browser detection functionality reference
- [readability](https://github.com/mozilla/readability/) - A standalone version of the readability lib
- [edge-paths](https://github.com/shirshak55/edge-paths) - Edge browser path finder
