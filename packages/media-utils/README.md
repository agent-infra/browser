# Media Utils

A utility package for handling media files, specifically designed for processing base64 encoded images.

## Features

- Parse base64 image data and extract metadata
- Detect image format (PNG, JPEG, WebP, GIF, BMP)
- Extract image dimensions
- Convert between different image data formats
- Works in both Node.js and browser environments

## Installation

```bash
npm install @agent-infra/media-utils
```

## Base64ImageParser

> [!NOTE]
> Currently only supports parsing **static** base64 image formats: PNG, JPEG, WebP, GIF, and BMP

### Platform Compatibility

Supports both Node.js and browsers.

### Basic Usage

```typescript
import { Base64ImageParser } from '@agent-infra/media-utils';

// Initialize with a base64 image string
// You only need to ensure that the input base64 string is image data; the data URI prefix is not required.
const tool = new Base64ImageParser('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgA...');
// or
const tool = new Base64ImageParser('iVBORw0KGgoAAAANSUhEUgA...');

// Get image type
const imageType = tool.getImageType(); // 'png' | 'jpeg' | 'webp' | 'gif' | 'bmp' | null

// Get image dimensions
const dimensions = tool.getDimensions(); // { width: number, height: number } | null

// Get pure base64 string (without data URI prefix)
const pureBase64 = tool.getPureBase64Image();

// Get image buffer
const buffer = tool.getBuffer(); // Uint8Array

// Get data URI
const dataUri = tool.getDataUri(); // 'data:image/png;base64,...'
```

### Example

```typescript
import { Base64ImageParser } from '@agent-infra/media-utils';

const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

const tool = new Base64ImageParser(base64Image);

console.log('Image type:', tool.getImageType()); // 'png'
console.log('Dimensions:', tool.getDimensions()); // { width: 1, height: 1 }
console.log('Pure base64:', tool.getPureBase64Image()); // 'iVBORw0KGgo...'
```

## License

ISC
