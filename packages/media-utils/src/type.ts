/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
export type ImageType = 'jpeg' | 'png' | 'webp' | 'gif' | 'bmp';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageCompressionOptions {
  quality: number; // Compression quality (1-100)
  format?: 'jpeg' | 'png' | 'webp';
}

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  path: string;
  buffer: Buffer;
}
