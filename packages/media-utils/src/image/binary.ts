/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  IMAGE_MAGIC_NUMBERS,
  parseBmpDimensions,
  parseGifDimensions,
  parseJpegDimensions,
  parsePngDimensions,
  parseWebpDimensions,
} from './image-parse';

import type { ImageDimensions, ImageType } from '../type';

/**
 * Helper function to check if array starts with a specific pattern
 */
function startsWith(bytes: Uint8Array, pattern: Uint8Array): boolean {
  if (bytes.length < pattern.length) {
    return false;
  }

  for (let i = 0; i < pattern.length; i++) {
    if (bytes[i] !== pattern[i]) {
      return false;
    }
  }

  return true;
}

export class BinaryImageParser {
  private bytes: Uint8Array;

  private imageType: ImageType | null = null;
  private dimensions: ImageDimensions | null = null;

  constructor(imageBytes: Uint8Array) {
    this.bytes = imageBytes;
  }

  public getBuffer(): Uint8Array {
    return this.bytes;
  }

  /**
   * Get image type from binary magic numbers
   */
  public getImageType(): ImageType | null {
    if (this.imageType) {
      return this.imageType;
    }

    for (const [pattern, type] of IMAGE_MAGIC_NUMBERS) {
      if (startsWith(this.bytes, pattern)) {
        this.imageType = type;
        break;
      }
    }

    return this.imageType;
  }

  public getDimensions(): ImageDimensions | null {
    if (this.dimensions) {
      return this.dimensions;
    }

    const imageType = this.getImageType();
    if (!imageType) {
      return null;
    }

    try {
      switch (imageType) {
        case 'png': {
          this.dimensions = parsePngDimensions(this.bytes);
          break;
        }
        case 'jpeg': {
          this.dimensions = parseJpegDimensions(this.bytes);
          break;
        }
        case 'webp': {
          this.dimensions = parseWebpDimensions(this.bytes);
          break;
        }
        case 'gif': {
          this.dimensions = parseGifDimensions(this.bytes);
          break;
        }
        case 'bmp': {
          this.dimensions = parseBmpDimensions(this.bytes);
          break;
        }
        default:
          return null;
      }

      return this.dimensions;
    } catch (error) {
      console.warn('Failed to parse image dimensions:', error);
      return null;
    }
  }
}