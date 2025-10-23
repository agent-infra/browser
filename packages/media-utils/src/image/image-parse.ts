/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ImageType, ImageDimensions } from '../type';

export const IMAGE_MAGIC_STRINGS = new Map<string, ImageType>([
  ['/9j/', 'jpeg'], // JPEG: FF D8 FF
  ['iVBORw', 'png'], // PNG: 89 50 4E 47
  ['UklGR', 'webp'], // WebP: 52 49 46 46
  ['R0lGOD', 'gif'], // GIF: 47 49 46 38
  ['Qk', 'bmp'], // BMP: 42 4D
]);

export const IMAGE_MAGIC_NUMBERS = new Map<Uint8Array, ImageType>([
  [new Uint8Array([0xFF, 0xD8, 0xFF]), 'jpeg'], // JPEG: FF D8 FF
  [new Uint8Array([0x89, 0x50, 0x4E, 0x47]), 'png'], // PNG: 89 50 4E 47
  [new Uint8Array([0x52, 0x49, 0x46, 0x46]), 'webp'], // WebP: 52 49 46 46 (RIFF)
  [new Uint8Array([0x47, 0x49, 0x46, 0x38]), 'gif'], // GIF: 47 49 46 38
  [new Uint8Array([0x42, 0x4D]), 'bmp'], // BMP: 42 4D
]);

export function base64String2Uint8Array(base64: string): Uint8Array<ArrayBuffer> {
  // @ts-ignore
  if (typeof Uint8Array.fromBase64 === 'function') {
    // New Uint8Array API
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/fromBase64
    // @ts-ignore
    return Uint8Array.fromBase64(base64);
  } else if (typeof Buffer !== 'undefined') {
    // Node.js environment
    return new Uint8Array(Buffer.from(base64, 'base64'));
  } else {
    // Browser environment (legacy browsers)
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
  }
}

/**
 * PNG: https://github.com/corkami/pics/blob/master/binary/PNG.png
 * JPEG: https://github.com/corkami/pics/blob/master/binary/JPG.png
 * WEBP: https://datatracker.ietf.org/doc/rfc9649/
 * GIF: https://github.com/corkami/pics/blob/master/binary/GIF.png
 * BMP: https://github.com/corkami/pics/blob/master/binary/bmp3.png
 */

export function parsePngDimensions(bytes: Uint8Array): ImageDimensions {
  // PNG dimensions are at bytes 16-23 (big-endian)
  const width =
    (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
  const height =
    (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
  return { width, height };
}

export function parseJpegDimensions(bytes: Uint8Array): ImageDimensions {
  // JPEG requires parsing through segments to find SOF marker
  let i = 2; // Skip FF D8
  while (i < bytes.length - 1) {
    if (bytes[i] === 0xff) {
      const marker = bytes[i + 1];
      // SOF0, SOF1, SOF2 markers contain dimensions
      if (marker >= 0xc0 && marker <= 0xc3) {
        if (i + 8 < bytes.length) {
          const height = (bytes[i + 5] << 8) | bytes[i + 6];
          const width = (bytes[i + 7] << 8) | bytes[i + 8];
          return { width, height };
        }
      }
      // Skip to next segment
      if (i + 3 < bytes.length) {
        const segmentLength = (bytes[i + 2] << 8) | bytes[i + 3];
        i += 2 + segmentLength;
      } else {
        break;
      }
    } else {
      i++;
    }
  }
  throw new Error('Unable to find JPEG dimensions');
}

export function parseGifDimensions(bytes: Uint8Array): ImageDimensions {
  // GIF dimensions are at bytes 6-9 (little-endian)
  const width = bytes[6] | (bytes[7] << 8);
  const height = bytes[8] | (bytes[9] << 8);
  return { width, height };
}

export function parseWebpDimensions(bytes: Uint8Array): ImageDimensions {
  /**
   * WebP format varies, check for VP8/VP8L/VP8X
   *
   * - VP8 : Simple File Format (Lossy)
   * - VP8L: Simple File Format (Lossless)
   * - VP8X: Extended File Format
   */
  const fourCC = String.fromCharCode(
    bytes[12],
    bytes[13],
    bytes[14],
    bytes[15],
  );

  if (fourCC === 'VP8 ') {
    // VP8 format - dimensions are in the frame header
    // Skip chunk size (4 bytes) and frame tag (3 bytes) + key frame info (1 byte)
    const startByte = 20 + 3; // Start after VP8 chunk header + frame tag

    // Read width and height from VP8 frame header
    const width = bytes[startByte + 3] | (bytes[startByte + 4] << 8);
    const height = bytes[startByte + 5] | (bytes[startByte + 6] << 8);

    return {
      width: width & 0x3fff,
      height: height & 0x3fff,
    };
  } else if (fourCC === 'VP8L') {
    // VP8L format - dimensions are right after the signature
    // Skip chunk size (4 bytes) and VP8L signature (1 byte)
    const startByte = 20 + 1;

    // Read 4 bytes containing width and height info
    const bits =
      bytes[startByte] |
      (bytes[startByte + 1] << 8) |
      (bytes[startByte + 2] << 16) |
      (bytes[startByte + 3] << 24);

    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;

    return { width, height };
  } else if (fourCC === 'VP8X') {
    // VP8X format - extended format with dimensions in header
    // Skip chunk size (4 bytes) and flags (4 bytes)
    const startByte = 20 + 4;

    // Width is stored in 3 bytes (little endian) + 1
    const width =
      bytes[startByte] |
      (bytes[startByte + 1] << 8) |
      (bytes[startByte + 2] << 16);

    // Height is stored in next 3 bytes (little endian) + 1
    const height =
      bytes[startByte + 3] |
      (bytes[startByte + 4] << 8) |
      (bytes[startByte + 5] << 16);

    return {
      width: width + 1,
      height: height + 1,
    };
  }

  throw new Error('Unsupported WebP format');
}

export function parseBmpDimensions(bytes: Uint8Array): ImageDimensions {
  // BMP dimensions are at bytes 18-25 (little-endian)
  const width =
    bytes[18] | (bytes[19] << 8) | (bytes[20] << 16) | (bytes[21] << 24);
  const height =
    bytes[22] | (bytes[23] << 8) | (bytes[24] << 16) | (bytes[25] << 24);
  return { width, height };
}