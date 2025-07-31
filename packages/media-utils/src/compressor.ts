/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import imagemin from 'imagemin';
import imageminPngquant from 'imagemin-pngquant';
import imageminMozjpeg from 'imagemin-mozjpeg';
import imageminWebp from 'imagemin-webp';

import { ImageCompressionOptions } from './type';

/**
 * High-performance image compression utility class
 */
export class ImageCompressor {
  public readonly options: ImageCompressionOptions;

  constructor(options?: ImageCompressionOptions) {
    // Set default options
    this.options = {
      quality: options?.quality ?? 80,
      format: options?.format ?? 'webp',
    };
  }

  /**
   * Compress image and return Buffer without writing to file
   * @param imageBuffer Image Buffer
   */
  async compressToBuffer(imageBuffer: Uint8Array) {
    // Choose appropriate compression plugin
    const plugins = this.getPluginsForFormat();

    // Compress image
    return await imagemin.buffer(imageBuffer, {
      plugins,
    });
  }

  /**
   * Select plugins based on target format
   */
  private getPluginsForFormat() {
    const quality = this.options.quality / 100; // Convert to 0-1 range (required by some plugins)

    switch (this.options.format) {
      case 'jpeg':
        return [imageminMozjpeg({ quality: this.options.quality })];
      case 'png':
        return [
          imageminPngquant({
            quality: [quality, Math.min(quality + 0.2, 1)],
          }),
        ];
      case 'webp':
        return [imageminWebp({ quality: this.options.quality })];
      default:
        return [imageminWebp({ quality: this.options.quality })];
    }
  }

  /**
   * Get formatted description of current compression options
   */
  getOptionsDescription(): string {
    return `Quality: ${this.options.quality}, Format: ${this.options.format}`;
  }
}
