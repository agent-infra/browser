# Browser Context

A powerful web content extraction library that extracts clean, readable content from web pages and converts it to Markdown format. Built for browser automation and content processing workflows.

## Features

- **Smart Content Extraction**: Uses advanced algorithms (Defuddle + Mozilla Readability) to extract main content from web pages
- **HTML to Markdown Conversion**: Clean conversion with support for GitHub Flavored Markdown (GFM)
- **Browser Integration**: Works seamlessly with Puppeteer and other browser automation tools
- **Fallback Strategy**: Automatically falls back to Readability when primary extraction fails
- **Customizable**: Configurable tag removal and conversion options

## Installation

```bash
pnpm install @agent-infra/browser-context
```

## Usage

### Basic Content Extraction

Extract clean content from a web page using Puppeteer:

```typescript
import { extractContent } from '@agent-infra/browser-context';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('https://example.com/article');

// Extract content as Markdown
const result = await extractContent(page);
console.log(result.title);   // Article title
console.log(result.content); // Clean Markdown content

await browser.close();
```

### Manual Content Extraction

Extract content from HTML strings:

```typescript
import { extractWithDefuddle, extractWithReadability } from '@agent-infra/browser-context';

// Using Defuddle (primary method)
const result1 = await extractWithDefuddle(htmlString, url, {
  markdown: true
});

// Using Readability (fallback method)
const result2 = await extractWithReadability(page, {
  markdown: true
});
```

### HTML to Markdown Conversion

Convert HTML content to Markdown:

```typescript
import { toMarkdown } from '@agent-infra/browser-context';

const html = '<h1>Title</h1><p>Content with <strong>bold</strong> text</p>';
const markdown = toMarkdown(html, {
  gfmExtension: true,        // Enable GitHub Flavored Markdown
  codeBlockStyle: 'fenced',  // Use fenced code blocks
  headingStyle: 'atx'        // Use # style headings
});

console.log(markdown);
// # Title
// 
// Content with **bold** text
```

### Advanced HTML to Markdown Options

```typescript
import { toMarkdown, DEFAULT_TAGS_TO_REMOVE } from '@agent-infra/browser-context';

const options = {
  gfmExtension: true,
  codeBlockStyle: 'fenced' as const,
  headingStyle: 'atx' as const,
  emDelimiter: '*',
  strongDelimiter: '**',
  removeTags: [...DEFAULT_TAGS_TO_REMOVE, 'footer', 'nav'] // Remove additional tags
};

const markdown = toMarkdown(htmlContent, options);
```

## API Reference

### `extractContent(page: Page)`

Main extraction function that automatically tries Defuddle first, then falls back to Readability.

**Parameters:**
- `page`: Puppeteer page instance

**Returns:**
- `Promise<{title: string, content: string}>`: Extracted title and Markdown content

### `extractWithDefuddle(html: string, url: string, options: DefuddleOptions)`

Extract content using the Defuddle library.

**Parameters:**
- `html`: HTML content string
- `url`: Page URL
- `options`: Defuddle configuration options

### `extractWithReadability(page: Page, options?)`

Extract content using Mozilla's Readability algorithm.

**Parameters:**
- `page`: Puppeteer page instance
- `options.markdown`: Whether to convert to Markdown (default: false)

### `toMarkdown(html: string, options?: ToMarkdownOptions)`

Convert HTML to Markdown format.

**Parameters:**
- `html`: HTML content string
- `options`: Conversion options

**ToMarkdownOptions:**
- `gfmExtension`: Enable GitHub Flavored Markdown (default: true)
- `removeTags`: Array of HTML tags to remove
- `codeBlockStyle`: 'indented' | 'fenced'
- `headingStyle`: 'setext' | 'atx'
- `emDelimiter`: Emphasis delimiter
- `strongDelimiter`: Strong emphasis delimiter

## Content Extraction Strategy

The library uses a smart two-tier extraction strategy:

1. **Primary**: Defuddle library for accurate content extraction
2. **Fallback**: Mozilla Readability algorithm when Defuddle fails

This ensures maximum compatibility and extraction success across different website structures.

## Removed HTML Elements

By default, the following HTML elements are removed during Markdown conversion:

- `script`, `style`, `link`, `head`
- `iframe`, `video`, `audio`, `canvas`
- `object`, `embed`, `noscript`
- `aside`, `dialog`

You can customize this list using the `removeTags` option.

## Browser Compatibility

This library is designed to work with:
- Puppeteer
- Playwright
- Any browser automation tool that provides a Page-like interface

## License

Apache License 2.0.

## Credits

Special thanks to the open source projects that inspired this toolkit:

- [readability](https://github.com/mozilla/readability/) - A standalone version of the readability lib
