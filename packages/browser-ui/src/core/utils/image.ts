/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
export type ImageSource = ImageBitmap | HTMLImageElement;

type ImageType = 'jpeg' | 'png';

function supportsCreateImageBitmap(): boolean {
  return typeof createImageBitmap === 'function';
}

function normalizeBase64ToDataUrl(
  base64: string,
  imageType: ImageType,
): string {
  return `data:image/${imageType};base64,${base64}`;
}

async function createImageBitmapFromBase64(
  base64: string,
  imageType: ImageType,
): Promise<ImageBitmap> {
  const dataUrl = normalizeBase64ToDataUrl(base64, imageType);

  const response = await fetch(dataUrl);
  const blob = await response.blob();

  return await createImageBitmap(blob);
}

function createImageFromBase64Fallback(
  base64: string,
  imageType: ImageType,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve(img);
    };

    img.onerror = (error) => {
      reject(new Error(`Failed to load image: ${error}`));
    };

    img.src = normalizeBase64ToDataUrl(base64, imageType);
  });
}

export async function createImageFromBase64(
  base64: string,
  imageType: ImageType,
): Promise<ImageSource> {
  if (supportsCreateImageBitmap()) {
    return await createImageBitmapFromBase64(base64, imageType);
  } else {
    return await createImageFromBase64Fallback(base64, imageType);
  }
}

function releaseImageSource(imageSource: ImageSource) {
  if ('close' in imageSource && typeof imageSource.close === 'function') {
    imageSource.close();
    return;
  }

  if (imageSource instanceof HTMLImageElement) {
    imageSource.src = '';
  }
}

export async function drawBase64ToCanvas(
  canvas: HTMLCanvasElement,
  base64: string,
  width: number,
  height: number,
): Promise<void> {
  const imageSource = await createImageFromBase64(base64, 'jpeg');
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(imageSource, 0, 0, width, height);

  releaseImageSource(imageSource);
}
