export type ImageSource = ImageBitmap | HTMLImageElement;

function supportsCreateImageBitmap(): boolean {
  return typeof createImageBitmap === 'function';
}

function normalizeBase64ToDataUrl(
  base64: string,
  mimeType = 'image/jpeg',
): string {
  return `data:${mimeType};base64,${base64}`;
}

async function createImageBitmapFromBase64(base64: string): Promise<ImageBitmap> {
  const dataUrl = normalizeBase64ToDataUrl(base64);

  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return await createImageBitmap(blob);
  } catch (error) {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    return await createImageBitmap(img);
  }
}

function createImageFromBase64Fallback(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve(img);
    };
    
    img.onerror = (error) => {
      reject(new Error(`Failed to load image: ${error}`));
    };
    
    img.src = normalizeBase64ToDataUrl(base64);
  });
}

export async function createImageFromBase64(base64: string): Promise<ImageSource> {
  if (supportsCreateImageBitmap()) {
    return await createImageBitmapFromBase64(base64);
  } else {
    return await createImageFromBase64Fallback(base64);
  }
}

export async function drawBase64ToCanvas(
  canvas: HTMLCanvasElement,
  base64: string,
  x = 0,
  y = 0,
  width: number,
  height: number,
): Promise<void> {
  const imageSource = await createImageFromBase64(base64);
  const pixelRatio = window.devicePixelRatio || 1;
  const ctx = canvas.getContext('2d')!;

  // 设置 canvas 的内部分辨率以支持高分屏
  const scaledWidth = width * pixelRatio;
  const scaledHeight = height * pixelRatio;
  
  // 设置 canvas 的实际尺寸（内部分辨率）
  canvas.width = scaledWidth;
  canvas.height = scaledHeight;
  
  // 通过 CSS 设置 canvas 的显示尺寸
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  
  // 缩放绘图上下文以匹配设备像素比
  ctx.scale(pixelRatio, pixelRatio);
  
  // 使用原始坐标和尺寸进行绘制
  ctx.drawImage(imageSource, x, y, width, height);

  if ('close' in imageSource && typeof imageSource.close === 'function') {
    imageSource.close();
  }
}