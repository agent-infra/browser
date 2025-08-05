import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ImageCompressor } from '../src/compressor';

describe('ImageCompressor', () => {
  let testImages: { [key: string]: Buffer } = {};

  beforeAll(() => {
    // Load test images
    const imageFiles = [
      'logo_240_223.png',
      'logo_240_223.jpeg',
      'VP8_240_223.webp',
      'VP8X_240_223.webp',
      'VP8L_240_223.webp',
      'logo_240_223.gif',
      'logo_240_223.bmp',
    ];

    imageFiles.forEach((filename) => {
      try {
        const imagePath = join(__dirname, 'images', filename);
        testImages[filename] = readFileSync(imagePath);
      } catch (error) {
        console.warn(`Could not load test image: ${filename}`, error);
      }
    });
  });

  describe('Constructor', () => {
    it('should use default options when no options provided', () => {
      const compressor = new ImageCompressor();
      
      expect(compressor.options.quality).toBe(80);
      expect(compressor.options.format).toBe('webp');
      expect(compressor.options.width).toBeUndefined();
      expect(compressor.options.height).toBeUndefined();
    });

    it('should use custom options when provided', () => {
      const options = {
        quality: 60,
        format: 'jpeg' as const,
        width: 800,
        height: 600,
      };
      const compressor = new ImageCompressor(options);
      
      expect(compressor.options.quality).toBe(60);
      expect(compressor.options.format).toBe('jpeg');
      expect(compressor.options.width).toBe(800);
      expect(compressor.options.height).toBe(600);
    });

    it('should merge default and custom options', () => {
      const compressor = new ImageCompressor({ quality: 90 });
      
      expect(compressor.options.quality).toBe(90);
      expect(compressor.options.format).toBe('webp'); // default
      expect(compressor.options.width).toBeUndefined();
    });
  });

  describe('compressToBuffer', () => {
    it('should compress PNG image to WebP format by default', async () => {
      const compressor = new ImageCompressor();
      const originalBuffer = testImages['logo_240_223.png'];
      
      if (!originalBuffer) {
        console.warn('PNG test image not available, skipping test');
        return;
      }

      const compressedBuffer = await compressor.compressToBuffer(originalBuffer);
      
      expect(compressedBuffer).toBeInstanceOf(Uint8Array);
      expect(compressedBuffer[0]).toBe(0x52);
      expect(compressedBuffer[1]).toBe(0x49);
    });

    it('should compress to JPEG format when specified', async () => {
      const compressor = new ImageCompressor({ format: 'jpeg', quality: 75 });
      const originalBuffer = testImages['logo_240_223.png'];

      if (!originalBuffer) {
        console.warn('PNG test image not available, skipping test');
        return;
      }

      const compressedBuffer =
        await compressor.compressToBuffer(originalBuffer);

      console.log(
        'original Buffer:',
        originalBuffer[0].toString(16),
        originalBuffer[1].toString(16),
      );

      console.log(
        'Compressed Buffer:',
        compressedBuffer[0].toString(16),
        compressedBuffer[1].toString(16),
      );

      expect(compressedBuffer).toBeInstanceOf(Uint8Array);
      // JPEG signature check
      expect(compressedBuffer[0]).toBe(0xff);
      expect(compressedBuffer[1]).toBe(0xd8);
    });

    it('should compress to PNG format when specified', async () => {
      const compressor = new ImageCompressor({ format: 'png', quality: 85 });
      const originalBuffer = testImages['logo_240_223.jpeg'];
      
      if (!originalBuffer) {
        console.warn('JPEG test image not available, skipping test');
        return;
      }

      const compressedBuffer = await compressor.compressToBuffer(originalBuffer);
      
      expect(compressedBuffer).toBeInstanceOf(Uint8Array);
      expect(compressedBuffer.length).toBeGreaterThan(0);
      // PNG signature check
      expect(compressedBuffer[0]).toBe(0x89);
      expect(compressedBuffer[1]).toBe(0x50);
      expect(compressedBuffer[2]).toBe(0x4e);
      expect(compressedBuffer[3]).toBe(0x47);
    });

    it('should compress WebP images', async () => {
      const compressor = new ImageCompressor({ format: 'webp', quality: 70 });
      const originalBuffer = testImages['VP8_240_223.webp'];
      
      if (!originalBuffer) {
        console.warn('WebP test image not available, skipping test');
        return;
      }

      const compressedBuffer = await compressor.compressToBuffer(originalBuffer);
      
      expect(compressedBuffer).toBeInstanceOf(Uint8Array);
      expect(compressedBuffer.length).toBeGreaterThan(0);
    });

    it('should handle different quality levels', async () => {
      const originalBuffer = testImages['logo_240_223.png'];
      
      if (!originalBuffer) {
        console.warn('PNG test image not available, skipping test');
        return;
      }

      const highQualityCompressor = new ImageCompressor({ quality: 95 });
      const lowQualityCompressor = new ImageCompressor({ quality: 30 });

      const highQualityBuffer = await highQualityCompressor.compressToBuffer(originalBuffer);
      const lowQualityBuffer = await lowQualityCompressor.compressToBuffer(originalBuffer);

      expect(highQualityBuffer.length).toBeGreaterThan(lowQualityBuffer.length);
    });

    it('should handle BMP images', async () => {
      const compressor = new ImageCompressor();
      const originalBuffer = testImages['logo_240_223.bmp'];
      
      if (!originalBuffer) {
        console.warn('BMP test image not available, skipping test');
        return;
      }

      const compressedBuffer = await compressor.compressToBuffer(originalBuffer);
      
      expect(compressedBuffer).toBeInstanceOf(Uint8Array);
      expect(compressedBuffer.length).toBeGreaterThan(0);
      expect(compressedBuffer.length).toBeLessThan(originalBuffer.length);
    });

    it('should handle GIF images', async () => {
      const compressor = new ImageCompressor();
      const originalBuffer = testImages['logo_240_223.gif'];
      
      if (!originalBuffer) {
        console.warn('GIF test image not available, skipping test');
        return;
      }

      const compressedBuffer = await compressor.compressToBuffer(originalBuffer);
      
      expect(compressedBuffer).toBeInstanceOf(Uint8Array);
      expect(compressedBuffer.length).toBeGreaterThan(0);
    });

    it('should throw error for invalid image data', async () => {
      const compressor = new ImageCompressor();
      const invalidBuffer = Buffer.from([1, 2, 3, 4, 5])

      await expect(compressor.compressToBuffer(invalidBuffer)).rejects.toThrow();
    });
  });

  describe.skip('compressToBase64', () => {
    it('should compress image and return base64 string', async () => {
      const compressor = new ImageCompressor();
      const originalBuffer = testImages['logo_240_223.png'];
      
      if (!originalBuffer) {
        console.warn('PNG test image not available, skipping test');
        return;
      }

      const base64String = await compressor.compressToBase64(originalBuffer);

      expect(typeof base64String).toBe('string');
      expect(base64String.length).toBeGreaterThan(0);
      expect(base64String).toMatch(/^[A-Za-z0-9+/=]+$/); // Valid base64 pattern
    });

    it('should return different base64 strings for different quality settings', async () => {
      const originalBuffer = testImages['logo_240_223.jpeg'];
      
      if (!originalBuffer) {
        console.warn('JPEG test image not available, skipping test');
        return;
      }

      const highQualityCompressor = new ImageCompressor({ quality: 90 });
      const lowQualityCompressor = new ImageCompressor({ quality: 40 });

      const highQualityBase64 = await highQualityCompressor.compressToBase64(originalBuffer);
      const lowQualityBase64 = await lowQualityCompressor.compressToBase64(originalBuffer);

      expect(highQualityBase64).not.toBe(lowQualityBase64);
      expect(highQualityBase64.length).toBeGreaterThan(lowQualityBase64.length);
    });

    it('should handle different image formats', async () => {
      const formats = ['jpeg', 'png', 'webp'] as const;
      const originalBuffer = testImages['logo_240_223.png'];
      
      if (!originalBuffer) {
        console.warn('PNG test image not available, skipping test');
        return;
      }

      for (const format of formats) {
        const compressor = new ImageCompressor({ format, quality: 75 });
        const base64String = await compressor.compressToBase64(originalBuffer);

        expect(typeof base64String).toBe('string');
        expect(base64String.length).toBeGreaterThan(0);
      }
    });
  });

  describe.skip('getOptionsDescription', () => {
    it('should return description with quality and format only', () => {
      const compressor = new ImageCompressor({ quality: 75, format: 'jpeg' });
      const description = compressor.getOptionsDescription();

      expect(description).toBe('Quality: 75, Format: jpeg');
    });

    it('should include width when specified', () => {
      const compressor = new ImageCompressor({ quality: 80, format: 'webp', width: 800 });
      const description = compressor.getOptionsDescription();

      expect(description).toBe('Quality: 80, Format: webp, Width: 800px');
    });

    it('should include height when specified', () => {
      const compressor = new ImageCompressor({ quality: 60, format: 'png', height: 600 });
      const description = compressor.getOptionsDescription();

      expect(description).toBe('Quality: 60, Format: png, Height: 600px');
    });

    it('should include both width and height when specified', () => {
      const compressor = new ImageCompressor({ 
        quality: 90, 
        format: 'jpeg', 
        width: 1024, 
        height: 768 
      });
      const description = compressor.getOptionsDescription();

      expect(description).toBe('Quality: 90, Format: jpeg, Width: 1024px, Height: 768px');
    });

    it('should show default options description', () => {
      const compressor = new ImageCompressor();
      const description = compressor.getOptionsDescription();

      expect(description).toBe('Quality: 80, Format: webp');
    });
  });

  describe.skip('Edge Cases', () => {
    it('should handle extremely small images', async () => {
      // This would require a very small valid image file
      const compressor = new ImageCompressor();
      const originalBuffer = testImages['logo_240_223.png'];
      
      if (!originalBuffer) {
        console.warn('PNG test image not available, skipping test');
        return;
      }

      const compressedBuffer = await compressor.compressToBuffer(originalBuffer);
      expect(compressedBuffer.length).toBeGreaterThan(0);
    });

    it('should handle quality edge values', async () => {
      const originalBuffer = testImages['logo_240_223.png'];
      
      if (!originalBuffer) {
        console.warn('PNG test image not available, skipping test');
        return;
      }

      // Test minimum quality
      const minQualityCompressor = new ImageCompressor({ quality: 1 });
      const minQualityBuffer = await minQualityCompressor.compressToBuffer(originalBuffer);
      expect(minQualityBuffer.length).toBeGreaterThan(0);

      // Test maximum quality
      const maxQualityCompressor = new ImageCompressor({ quality: 100 });
      const maxQualityBuffer = await maxQualityCompressor.compressToBuffer(originalBuffer);
      expect(maxQualityBuffer.length).toBeGreaterThan(0);
    });

    it('should handle different WebP variants', async () => {
      const compressor = new ImageCompressor({ format: 'webp', quality: 75 });
      const webpVariants = ['VP8_240_223.webp', 'VP8X_240_223.webp', 'VP8L_240_223.webp'];

      for (const variant of webpVariants) {
        const originalBuffer = testImages[variant];
        
        if (!originalBuffer) {
          console.warn(`${variant} test image not available, skipping`);
          continue;
        }

        const compressedBuffer = await compressor.compressToBuffer(originalBuffer);
        expect(compressedBuffer).toBeInstanceOf(Uint8Array);
        expect(compressedBuffer.length).toBeGreaterThan(0);
      }
    });
  });
});
