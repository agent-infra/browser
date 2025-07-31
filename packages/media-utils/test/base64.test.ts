/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
} from 'vitest';
import { Base64ImageTool } from '../src';

interface TestImageData {
  name: string;
  extension: string;
  base64: string;
  dataUri: string;
  expectedType: string;
  expectedWidth: number;
  expectedHeight: number;
}

describe('Base64ImageTool', () => {
  let testImages: TestImageData[] = [];

  beforeAll(() => {
    const imageFiles = [
      'logo_240_223.png',
      'logo_240_223.jpeg',
      'VP8_240_223.webp',
      'VP8X_240_223.webp',
      'VP8L_240_223.webp',
      'logo_240_223.gif',
      'logo_240_223.bmp',
    ];
    const imagesDir = join(__dirname, 'images');

    testImages = imageFiles.map((filename) => {
      const filePath = join(imagesDir, filename);
      const buffer = readFileSync(filePath);
      const base64 = buffer.toString('base64');
      const extension = filename.split('.').pop()!;

      // Parse dimensions from filename: logo_{width}_{height}.{extension}
      const nameParts = filename.split('_');
      const expectedWidth = parseInt(nameParts[1], 10);
      const expectedHeight = parseInt(nameParts[2].split('.')[0], 10);

      return {
        name: filename,
        extension,
        base64,
        dataUri: `data:image/${extension};base64,${base64}`,
        expectedType: extension,
        expectedWidth,
        expectedHeight,
      };
    });
  });

  describe('constructor and basic methods', () => {
    it('should create instance with data URI', () => {
      testImages.forEach(({ dataUri, base64 }) => {
        const tool = new Base64ImageTool(dataUri);
        expect(tool.getPureBase64Image()).toBe(base64);
      });
    });

    it('should create instance with pure base64', () => {
      testImages.forEach(({ base64 }) => {
        const tool = new Base64ImageTool(base64);
        expect(tool.getPureBase64Image()).toBe(base64);
      });
    });
  });

  describe('getBuffer()', () => {
    it('should return correct Uint8Array buffer', () => {
      testImages.forEach(({ base64, name }) => {
        const tool = new Base64ImageTool(base64);
        const buffer = tool.getBuffer();

        expect(buffer).toBeInstanceOf(Uint8Array);
        expect(buffer.length).toBeGreaterThan(0);

        // Verify buffer content matches original
        const originalBuffer = Buffer.from(base64, 'base64');
        expect(Array.from(buffer)).toEqual(Array.from(originalBuffer));
      });
    });

    it('should cache buffer on subsequent calls', () => {
      const tool = new Base64ImageTool(testImages[0].base64);
      const buffer1 = tool.getBuffer();
      const buffer2 = tool.getBuffer();

      expect(buffer1).toStrictEqual(buffer2);
    });

    describe('browser environment simulation', () => {
      let originalBuffer: any;
      let originalAtob: any;

      beforeEach(() => {
        originalBuffer = globalThis.Buffer;
        originalAtob = globalThis.atob;

        // @ts-ignore
        delete globalThis.Buffer;

        if (!globalThis.atob) {
          globalThis.atob = (base64: string) => {
            return Buffer.from(base64, 'base64').toString('binary');
          };
        }
      });

      afterEach(() => {
        if (originalBuffer) {
          globalThis.Buffer = originalBuffer;
        }
        if (originalAtob) {
          globalThis.atob = originalAtob;
        } else {
          // @ts-ignore
          delete globalThis.atob;
        }
      });

      it('should work correctly in browser environment', () => {
        testImages.forEach(({ base64, name }) => {
          const tool = new Base64ImageTool(base64);
          const buffer = tool.getBuffer();

          expect(buffer).toBeInstanceOf(Uint8Array);
          expect(buffer.length).toBeGreaterThan(0);

          const expectedBuffer = originalBuffer.from(base64, 'base64');
          expect(Array.from(buffer)).toEqual(Array.from(expectedBuffer));
        });
      });

      it('should handle empty base64 in browser environment', () => {
        const tool = new Base64ImageTool('');
        const buffer = tool.getBuffer();

        expect(buffer).toBeInstanceOf(Uint8Array);
        expect(buffer.length).toBe(0);
      });

      it('should cache buffer in browser environment', () => {
        const tool = new Base64ImageTool(testImages[0].base64);
        const buffer1 = tool.getBuffer();
        const buffer2 = tool.getBuffer();

        expect(buffer1).toStrictEqual(buffer2);
      });
    });
  });

  describe('getImageType()', () => {
    it('should correctly identify image types', () => {
      testImages.forEach(({ base64, expectedType, name }) => {
        const tool = new Base64ImageTool(base64);
        const detectedType = tool.getImageType();

        expect(detectedType).toBe(expectedType);
      });
    });

    it('should return null for invalid image data', () => {
      const tool = new Base64ImageTool('invalidbase64data');
      expect(tool.getImageType()).toBeNull();
    });

    it('should cache image type on subsequent calls', () => {
      const tool = new Base64ImageTool(testImages[0].base64);
      const type1 = tool.getImageType();
      const type2 = tool.getImageType();

      expect(type1).toBe(type2);
    });
  });

  describe('getDimensions()', () => {
    it('should parse dimensions for all supported formats', () => {
      testImages.forEach(
        ({ base64, expectedType, name, expectedWidth, expectedHeight }) => {
          const tool = new Base64ImageTool(base64);
          const dimensions = tool.getDimensions();

          expect(dimensions).not.toBeNull();
          expect(dimensions!.width).toBeGreaterThan(0);
          expect(dimensions!.height).toBeGreaterThan(0);

          // Verify actual dimensions match expected dimensions
          expect(dimensions!.width).toBe(expectedWidth);
          expect(dimensions!.height).toBe(expectedHeight);
        },
      );
    });

    it('should return null for invalid image data', () => {
      const tool = new Base64ImageTool('invalidbase64data');
      expect(tool.getDimensions()).toBeNull();
    });

    it('should cache dimensions on subsequent calls', () => {
      const tool = new Base64ImageTool(testImages[0].base64);
      const dimensions1 = tool.getDimensions();
      const dimensions2 = tool.getDimensions();

      expect(dimensions1).toBe(dimensions2);
    });
  });

  describe('getDataUri()', () => {
    it('should generate correct data URI', () => {
      testImages.forEach(({ base64, expectedType, dataUri }) => {
        const tool = new Base64ImageTool(base64);

        const generatedDataUri = tool.getDataUri();
        expect(generatedDataUri).toBe(dataUri);
      });
    });

    it('should return undefined for unknown image type', () => {
      const tool = new Base64ImageTool('invalidbase64data');
      expect(tool.getDataUri()).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle empty base64 string', () => {
      const tool = new Base64ImageTool('');
      expect(tool.getPureBase64Image()).toBe('');
      expect(tool.getImageType()).toBeNull();
      expect(tool.getDimensions()).toBeNull();
    });

    it('should handle malformed data URI', () => {
      const tool = new Base64ImageTool('data:image/png;base64,');
      expect(tool.getPureBase64Image()).toBe('');
      expect(tool.getImageType()).toBeNull();
    });

    it('should handle corrupted image data gracefully', () => {
      const tool = new Base64ImageTool('YWJjZGVmZw=='); // "abcdefg" in base64
      expect(tool.getImageType()).toBeNull();
      expect(tool.getDimensions()).toBeNull();
    });
  });

  describe('integration tests', () => {
    it('should work with complete workflow', () => {
      testImages.forEach(
        ({ base64, expectedType, name, expectedWidth, expectedHeight }) => {
          const tool = new Base64ImageTool(base64);

          // Get all information
          const pureBase64 = tool.getPureBase64Image();
          const buffer = tool.getBuffer();
          const imageType = tool.getImageType();
          const dimensions = tool.getDimensions();
          const dataUri = tool.getDataUri();

          // Verify all results
          expect(pureBase64).toBe(base64);
          expect(buffer).toBeInstanceOf(Uint8Array);
          expect(imageType).toBe(expectedType);
          expect(dimensions).not.toBeNull();
          expect(dimensions!.width).toBe(expectedWidth);
          expect(dimensions!.height).toBe(expectedHeight);
          expect(dataUri).toContain(`data:image/${expectedType};base64,`);
        },
      );
    });
  });
});
