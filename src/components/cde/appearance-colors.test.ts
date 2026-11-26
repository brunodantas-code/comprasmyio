import { describe, expect, it } from "vitest";
import { converter } from "culori";
import { convertAppearanceColor, isContextualAppearanceColor, parseAppAppearance } from "./appearance-colors";

const rgb = converter("rgb");
describe("De-Para de Aparência", () => {
  it("reconhece somente os três padrões pedidos", () => {
    expect(["purple", "green", "grayscale"].map(parseAppAppearance)).toEqual(["purple", "green", "grayscale"]);
    expect(parseAppAppearance("blue")).toBeNull();
    expect(parseAppAppearance(null)).toBeNull();
  });
  it("converte verde myio no roxo myio exato sem alterar o valor de origem", () => {
    const original = "#0fc482";
    const result = rgb(convertAppearanceColor(original, "purple"));
    const target = rgb("#673ab6");
    if (!target) throw new Error("Cor roxa de referência inválida");
    expect(result?.r).toBeCloseTo(target.r, 5);
    expect(result?.g).toBeCloseTo(target.g, 5);
    expect(result?.b).toBeCloseTo(target.b, 5);
    expect(original).toBe("#0fc482");
  });
  it("converte o roxo para o verde selecionado", () => {
    const result = rgb(convertAppearanceColor("#673ab6", "green"));
    const target = rgb("#0fc482");
    if (!target) throw new Error("Cor verde de referência inválida");
    expect(result?.r).toBeCloseTo(target.r, 5);
    expect(result?.g).toBeCloseTo(target.g, 5);
    expect(result?.b).toBeCloseTo(target.b, 5);
  });
  it("verde claro vira lilás e verde escuro vira roxo escuro", () => {
    const oklch = converter("oklch");
    const light = oklch(convertAppearanceColor("oklch(0.95 0.04 160)", "purple"));
    const dark = oklch(convertAppearanceColor("oklch(0.37 0.105 166)", "purple"));
    expect(light?.h).toBeCloseTo(295, 0);
    expect(light?.l).toBeGreaterThan(0.9);
    expect(dark?.h).toBeCloseTo(295, 0);
    expect(dark?.l).toBeLessThan(0.3);
  });
  it("P&B remove saturação das demais cores e preserva transparência", () => {
    for (const value of ["#0fc482", "#673ab6", "rgba(15,196,130,0.4)"]) {
      const result = rgb(convertAppearanceColor(value, "grayscale"));
      expect(result?.r).toBeCloseTo(result?.g ?? -1, 5);
      expect(result?.g).toBeCloseTo(result?.b ?? -1, 5);
    }
    expect(rgb(convertAppearanceColor("rgba(15,196,130,0.4)", "grayscale"))?.alpha).toBe(0.4);
  });
  it("P&B preserves red only for tags and notification markers", () => {
    expect(convertAppearanceColor("#dc2626", "grayscale", true)).toBe("#dc2626");
    const ordinary = rgb(convertAppearanceColor("#dc2626", "grayscale", false));
    expect(ordinary?.r).toBeCloseTo(ordinary?.g ?? -1, 5);
    expect(ordinary?.g).toBeCloseTo(ordinary?.b ?? -1, 5);
  });
  it("P&B never preserves orange, green or purple as alert exceptions", () => {
    for (const color of ["#c2410c", "#0fc482", "#673ab6"]) {
      const result = rgb(convertAppearanceColor(color, "grayscale", true));
      expect(result?.r).toBeCloseTo(result?.g ?? -1, 5);
      expect(result?.g).toBeCloseTo(result?.b ?? -1, 5);
    }
  });
  it("P&B transforma o roxo escuro da landing em preto sem apagar o roxo myio comum", () => {
    for (const value of ["#0b0023", "oklch(0.18 0.09 300)", "oklch(0.27 0.12 300)"]) {
      const result = rgb(convertAppearanceColor(value, "grayscale"));
      expect(result?.r).toBe(0);
      expect(result?.g).toBe(0);
      expect(result?.b).toBe(0);
    }
    const brandPurple = rgb(convertAppearanceColor("#673ab6", "grayscale"));
    expect(brandPurple?.r).toBeGreaterThan(0);
    expect(brandPurple?.r).toBeCloseTo(brandPurple?.g ?? -1, 5);
    expect(brandPurple?.g).toBeCloseTo(brandPurple?.b ?? -1, 5);
  });
  it("mantém bolinhas, textos e tags vermelhos em todas as aparências", () => {
    for (const appearance of ["green", "purple", "grayscale"] as const) {
      for (const value of ["#ff0000", "#dc2626", "#7f1d1d", "#fef2f2", "oklch(0.58 0.22 27)"]) {
        expect(convertAppearanceColor(value, appearance)).toBe(value);
      }
    }
  });
  it("preserva a cor herdada pelos ícones de menus e barras de navegação", () => {
    expect(isContextualAppearanceColor("currentColor")).toBe(true);
    expect(isContextualAppearanceColor(" currentcolor ")).toBe(true);
    expect(isContextualAppearanceColor("var(--foreground)")).toBe(false);
    expect(isContextualAppearanceColor("#ffffff")).toBe(false);
  });
  it("mantém as referências semânticas e alertas em temas coloridos", () => {
    expect(convertAppearanceColor("var(--myio-green)", "purple")).toBe("var(--myio-green)");
    expect(convertAppearanceColor("#ff0000", "purple")).toBe("#ff0000");
    expect(convertAppearanceColor("transparent", "green")).toBe("transparent");
  });
});