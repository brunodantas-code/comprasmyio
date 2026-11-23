type Crop = { x: number; y: number; width: number; height: number };

const fullCrop = (width: number, height: number): Crop => ({ x: 0, y: 0, width, height });

export function detectReceiptCrop(pixels: Uint8ClampedArray, width: number, height: number): Crop {
  const count = width * height;
  const gray = new Uint8Array(count);
  const histogram = new Uint32Array(256);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const offset = index * 4;
      const value = Math.round((pixels[offset] ?? 0) * 0.299 + (pixels[offset + 1] ?? 0) * 0.587 + (pixels[offset + 2] ?? 0) * 0.114);
      gray[index] = value;
      histogram[value] = (histogram[value] ?? 0) + 1;
    }
  }
  // A continuous dark outline is a stronger boundary than a bright tabletop.
  const darkColumns = Array.from({ length: width }, (_, x) => {
    let dark = 0;
    for (let y = 0; y < height; y++) if ((gray[y * width + x] ?? 255) < 80) dark++;
    return dark / height;
  });
  const leftEdge = darkColumns.findIndex((ratio, x) => x < width * 0.35 && ratio > 0.6);
  let rightEdge = -1;
  for (let x = width - 1; x >= width * 0.5; x--) if ((darkColumns[x] ?? 0) > 0.6) { rightEdge = x; break; }
  if (leftEdge >= 0 && rightEdge - leftEdge > width * 0.35 && rightEdge - leftEdge < width * 0.96) {
    return { x: leftEdge, y: 0, width: rightEdge - leftEdge + 1, height };
  }
  let sum = 0;
  for (let value = 0; value < 256; value += 1) sum += value * (histogram[value] ?? 0);
  let background = 0;
  let weight = 0;
  let variance = 0;
  let otsu = 180;
  for (let value = 0; value < 256; value += 1) {
    weight += (histogram[value] ?? 0);
    if (!weight) continue;
    const foreground = count - weight;
    if (!foreground) break;
    background += value * (histogram[value] ?? 0);
    const meanBackground = background / weight;
    const meanForeground = (sum - background) / foreground;
    const between = weight * foreground * (meanBackground - meanForeground) ** 2;
    if (between > variance) { variance = between; otsu = value; }
  }
  // Paper remains a connected surface even when the surrounding table is bright.
  const threshold = Math.max(110, Math.min(200, otsu));
  const mask = new Uint8Array(count);
  for (let index = 0; index < count; index += 1) if ((gray[index] ?? 0) > threshold) mask[index] = 1;

  const stack = new Int32Array(count);
  let largest = 0;
  let bestScore = 0;
  let best = fullCrop(width, height);
  for (let start = 0; start < count; start += 1) {
    if (mask[start] !== 1) continue;
    let size = 0;
    let top = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    stack[top++] = start;
    mask[start] = 2;
    while (top) {
      const index = (stack[--top] ?? 0);
      const x = index % width;
      const y = Math.floor(index / width);
      size += 1;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      if (x > 0 && mask[index - 1] === 1) { mask[index - 1] = 2; stack[top++] = index - 1; }
      if (x + 1 < width && mask[index + 1] === 1) { mask[index + 1] = 2; stack[top++] = index + 1; }
      if (y > 0 && mask[index - width] === 1) { mask[index - width] = 2; stack[top++] = index - width; }
      if (y + 1 < height && mask[index + width] === 1) { mask[index + width] = 2; stack[top++] = index + width; }
    }
    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;
    const density = size / (boxWidth * boxHeight);
    const edges = Number(minX === 0) + Number(minY === 0) + Number(maxX === width - 1) + Number(maxY === height - 1);
    // Avoid picking scattered wood grain or the bright background around a dark paper edge.
    const score = size * density ** 3 * (edges >= 3 ? 0.08 : edges === 2 ? 0.3 : 1);
    if (boxWidth >= width * 0.15 && boxHeight >= height * 0.15 && score > bestScore) {
      bestScore = score;
      largest = size;
      best = { x: minX, y: minY, width: boxWidth, height: boxHeight };
    }
  }
  if (largest < count * 0.08 || best.width < width * 0.15 || best.height < height * 0.15) return fullCrop(width, height);
  const padX = Math.round(best.width * 0.006);
  const padY = Math.round(best.height * 0.006);
  const x = Math.max(0, best.x - padX);
  const y = Math.max(0, best.y - padY);
  const right = Math.min(width, best.x + best.width + padX);
  const bottom = Math.min(height, best.y + best.height + padY);
  return { x, y, width: right - x, height: bottom - y };
}

async function imageSource(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Falha ao gerar imagem P&B")), "image/jpeg", 0.94));
}

export async function prepareSpendReceipt(file: File): Promise<File> {
  if (file.type === "application/pdf") return file;
  const image = await imageSource(file);
  try {
    const detectionScale = Math.min(1, 480 / Math.max(image.width, image.height));
    const detectionWidth = Math.max(1, Math.round(image.width * detectionScale));
    const detectionHeight = Math.max(1, Math.round(image.height * detectionScale));
    const detection = document.createElement("canvas");
    detection.width = detectionWidth; detection.height = detectionHeight;
    const detectionContext = detection.getContext("2d", { willReadFrequently: true });
    if (!detectionContext) throw new Error("Canvas indisponível");
    detectionContext.drawImage(image.source, 0, 0, detectionWidth, detectionHeight);
    const detected = detectionContext.getImageData(0, 0, detectionWidth, detectionHeight);
    const crop = detectReceiptCrop(detected.data, detectionWidth, detectionHeight);
    const sx = crop.x / detectionScale;
    const sy = crop.y / detectionScale;
    const sw = crop.width / detectionScale;
    const sh = crop.height / detectionScale;
    const outputScale = Math.min(1, 1800 / Math.max(sw, sh));
    const output = document.createElement("canvas");
    output.width = Math.max(1, Math.round(sw * outputScale));
    output.height = Math.max(1, Math.round(sh * outputScale));
    const context = output.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas indisponível");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, output.width, output.height);
    context.drawImage(image.source, sx, sy, sw, sh, 0, 0, output.width, output.height);
    const result = context.getImageData(0, 0, output.width, output.height);
    const pixels = result.data;
    const width = output.width;
    const height = output.height;
    const gray = new Uint8Array(width * height);
    const integral = new Float64Array((width + 1) * (height + 1));
    for (let y = 0; y < height; y += 1) {
      let rowSum = 0;
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        const offset = index * 4;
        const value = (pixels[offset] ?? 0) * 0.299 + (pixels[offset + 1] ?? 0) * 0.587 + (pixels[offset + 2] ?? 0) * 0.114;
        gray[index] = Math.round(value);
        rowSum += value;
        integral[(y + 1) * (width + 1) + x + 1] = (integral[y * (width + 1) + x + 1] ?? 0) + rowSum;
      }
    }
    const radius = Math.max(12, Math.min(36, Math.round(Math.min(width, height) * 0.025)));
    const cleanDigital = gray.reduce((count, value) => count + Number(value >= 240), 0) / gray.length > 0.8;
    for (let y = 0; y < height; y += 1) {
      const top = Math.max(0, y - radius);
      const bottom = Math.min(height - 1, y + radius);
      for (let x = 0; x < width; x += 1) {
        const left = Math.max(0, x - radius);
        const right = Math.min(width - 1, x + radius);
        const stride = width + 1;
        const sum = (integral[(bottom + 1) * stride + right + 1] ?? 0) - (integral[top * stride + right + 1] ?? 0) - (integral[(bottom + 1) * stride + left] ?? 0) + (integral[top * stride + left] ?? 0);
        const mean = sum / ((bottom - top + 1) * (right - left + 1));
        const index = y * width + x;
        // Lift the paper/shadows to white, suppress low-contrast grain, but retain
        // grayscale strokes instead of destroying faint thermal-print characters.
        const contrast = mean - (gray[index] ?? 0);
        const value = cleanDigital ? (gray[index] ?? 255) : contrast <= 12 ? 255 : Math.max(0, Math.round(255 - (contrast - 12) * 4));
        const offset = index * 4;
        pixels[offset] = value; pixels[offset + 1] = value; pixels[offset + 2] = value; pixels[offset + 3] = 255;
      }
    }
    context.putImageData(result, 0, 0);
    const blob = await canvasBlob(output);
    const base = file.name.replace(/\.[^.]+$/, "") || "comprovante";
    return new File([blob], `${base}-pb.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    image.close();
  }
}
