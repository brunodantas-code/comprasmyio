import { describe, expect, it } from "vitest";
import { detectReceiptCrop } from "./receipt-image";

function photo(width: number, height: number, pixel: (x: number, y: number) => number) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 4;
    data[offset] = data[offset + 1] = data[offset + 2] = pixel(x, y);
    data[offset + 3] = 255;
  }
  return data;
}

describe("recorte de comprovantes", () => {
  it("separa o papel de uma mesa clara com borda escura e texto", () => {
    const data = photo(200, 300, (x, y) => {
      if (x >= 35 && x <= 140 && y >= 20 && y <= 280) {
        if (x < 40 || x > 135 || y < 25 || y > 275) return 15;
        if (y % 20 < 3 && x > 48 && x < 125) return 45;
        return 235;
      }
      return y % 6 === 0 ? 90 : 220;
    });
    const crop = detectReceiptCrop(data, 200, 300);
    expect(crop.x).toBeGreaterThanOrEqual(35);
    expect(crop.x + crop.width).toBeLessThanOrEqual(141);
    expect(crop.y).toBeLessThanOrEqual(25);
    expect(crop.y + crop.height).toBeGreaterThanOrEqual(275);
  });

  it("mantém a imagem inteira quando não identifica papel com segurança", () => {
    expect(detectReceiptCrop(photo(80, 100, () => 50), 80, 100)).toEqual({ x: 0, y: 0, width: 80, height: 100 });
  });
});