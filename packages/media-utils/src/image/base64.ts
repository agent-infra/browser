/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  base64String2Uint8Array,
  IMAGE_MAGIC_STRINGS,
  parseBmpDimensions,
  parseGifDimensions,
  parseJpegDimensions,
  parsePngDimensions,
  parseWebpDimensions,
} from './image-parse';

import type { ImageDimensions, ImageType } from '../type';

export class Base64ImageParser {
  private pureBase64: string;
  private buffer?: Uint8Array;

  private imageType: ImageType | null = null;
  private dimensions: ImageDimensions | null = null;

  constructor(base64Image: string) {
    this.pureBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
  }

  public getPureBase64Image(): string {
    return this.pureBase64;
  }

  public getBuffer(): Uint8Array {
    this.buffer = base64String2Uint8Array(this.pureBase64);

    return this.buffer;
  }

  /**
   * get image type form base64 magic number
   */
  public getImageType(): ImageType | null {
    if (this.imageType) {
      return this.imageType;
    }

    const prefix = this.pureBase64.substring(0, 8);

    for (const [signature, type] of IMAGE_MAGIC_STRINGS) {
      if (prefix.startsWith(signature)) {
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
          const bytes = this.getHeaderBuffer(32); // 16-23
          this.dimensions = parsePngDimensions(bytes);
          break;
        }
        case 'jpeg': {
          try {
            const headerBytes = this.getHeaderBuffer(1024); // SOF marker
            this.dimensions = parseJpegDimensions(headerBytes);
          } catch(e) {
            const fullBuffer = this.getBuffer();
            this.dimensions = parseJpegDimensions(fullBuffer);
          }
          break;
        }
        case 'webp': {
          const bytes = this.getHeaderBuffer(32); // 23 - 29
          this.dimensions = parseWebpDimensions(bytes);
          break;
        }
        case 'gif': {
          const bytes = this.getHeaderBuffer(24); // 6 - 9
          this.dimensions = parseGifDimensions(bytes);
          break;
        }
        case 'bmp': {
          const bytes = this.getHeaderBuffer(40); // 18-25
          this.dimensions = parseBmpDimensions(bytes);
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

  public getDataUri() {
    const imageType = this.getImageType();
    if (imageType) {
      return `data:image/${this.imageType};base64,${this.pureBase64}`;
    }

    return null;
  }

  /**
   * Get only the header bytes needed for dimension parsing
   * This is much more memory efficient than converting the entire image
   */
  private getHeaderBuffer(maxBytes: number): Uint8Array {
    if (this.buffer) {
      return this.buffer;
    }

    // Calculate how much of the base64 we need to decode
    // Base64 encoding: 4 characters represent 3 bytes
    const base64CharsNeeded = Math.ceil((maxBytes * 4) / 3);
    // Round up to nearest multiple of 4 to avoid padding issues
    const alignedChars = Math.ceil(base64CharsNeeded / 4) * 4;
    const headerBase64 = this.pureBase64.substring(0, alignedChars);

    return base64String2Uint8Array(headerBase64);
  }
}