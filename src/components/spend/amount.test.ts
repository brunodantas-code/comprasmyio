import { describe, expect, it } from "vitest";
import { formatSpendAmount, parseSpendAmount } from "./amount";

describe("Spend valores brasileiros", () => {
  it("apresenta milhares com ponto e duas casas decimais", () => {
    expect(formatSpendAmount(1000)).toBe("1.000,00");
    expect(formatSpendAmount(100)).toBe("100,00");
    expect(formatSpendAmount(1234.5)).toBe("1.234,50");
  });

  it("interpreta os valores editados sem perder os centavos", () => {
    expect(parseSpendAmount("1.000,00")).toBe(1000);
    expect(parseSpendAmount("100,90")).toBe(100.9);
    expect(parseSpendAmount("1000.00")).toBe(1000);
    expect(parseSpendAmount("1.000")).toBe(1000);
  });
});
