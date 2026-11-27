import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { APP_NAME_COLORS, APP_TILE_COLORS } from "./app-order-config";
import { themeColorLabel, themedColorOptions } from "./appearance-names";

const LISTS: [string, readonly { key: string; label: string; value: string }[]][] = [
  ...Object.entries(APP_TILE_COLORS).map(([kind, list]) => [kind, list] as [string, readonly { key: string; label: string; value: string }[]]),
  ["nomes dos apps", APP_NAME_COLORS],
];
const THEMES = ["green", "purple", "grayscale"] as const;

describe("nomes das cores do CDE acompanham o tema ativo", () => {
  it("chama de roxo o verde que aparece roxo no tema Roxo", () => {
    expect(themeColorLabel("Verde myio", "purple")).toBe("Roxo myio");
    expect(themeColorLabel("Verde claro myio", "purple")).toBe("Lilás claro myio");
    expect(themeColorLabel("Roxo myio", "purple")).toBe("Roxo myio");
  });

  it("chama de cinza as cores da marca no tema P&B", () => {
    expect(themeColorLabel("Verde myio", "grayscale")).toBe("Cinza myio");
    expect(themeColorLabel("Roxo myio", "grayscale")).toBe("Cinza escuro myio");
    expect(themeColorLabel("Escuro myio", "grayscale")).toBe("Preto myio");
    expect(themeColorLabel("Roxo noite myio (tela de acesso)", "grayscale")).toBe("Preto myio (tela de acesso)");
  });

  it("mantém o nome da marca no tema Verde", () => {
    expect(themeColorLabel("Verde myio", "green")).toBe("Verde myio");
    expect(themeColorLabel("Verde myio (igual ao ícone)", "green")).toBe("Verde myio (igual ao ícone)");
  });

  it("distingue a cor que segue o tema quando ela repetiria o nome de uma cor fixa", () => {
    const fill = themedColorOptions(APP_TILE_COLORS.fill, "purple");
    expect(fill.find((o) => o.value === "var(--myio-green)")?.label).toBe("Roxo myio (do tema)");
    expect(fill.find((o) => o.value === "var(--myio-purple)")?.label).toBe("Roxo myio");
    const border = themedColorOptions(APP_TILE_COLORS.border, "purple");
    expect(border.find((o) => o.value === "var(--myio-green)")?.label).toBe("Roxo myio (igual ao ícone)");
  });

  it("nenhum seletor repete nome em nenhum dos três temas", () => {
    for (const theme of THEMES) for (const [kind, list] of LISTS) {
      const labels = themedColorOptions(list, theme).map((o) => o.label);
      expect(new Set(labels).size, `${kind} no tema ${theme}`).toBe(labels.length);
    }
  });

  it("oferece o ícone minimalista sem caixa e o texto na cor do tema", () => {
    expect(APP_TILE_COLORS.fill.some((o) => o.value === "transparent")).toBe(true);
    expect(APP_TILE_COLORS.border.some((o) => o.value === "transparent")).toBe(true);
    expect(APP_TILE_COLORS.symbol.some((o) => o.value === "var(--myio-green)")).toBe(true);
    expect(APP_TILE_COLORS.inside.some((o) => o.value === "var(--myio-green)")).toBe(true);
  });
});
