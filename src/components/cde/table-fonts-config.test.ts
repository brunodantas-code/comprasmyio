import { describe, expect, it } from "vitest";
import { TABLE_FONTS_DEFAULT, parseTableFonts } from "./table-fonts-config";

describe("parseTableFonts", () => {
  it("usa o padrão 11/12 quando não há padrão salvo", () => {
    expect(parseTableFonts(undefined)).toMatchObject({ headerPx: 11, filterPx: 12 });
    expect(parseTableFonts(null)).toMatchObject(TABLE_FONTS_DEFAULT);
    expect(parseTableFonts("")).toMatchObject(TABLE_FONTS_DEFAULT);
  });

  it("aceita tamanhos válidos salvos no CDE", () => {
    expect(parseTableFonts('{"headerPx":13,"filterPx":14}')).toMatchObject({ headerPx: 13, filterPx: 14 });
    expect(parseTableFonts('{"headerPx":10,"filterPx":11}')).toMatchObject({ headerPx: 10, filterPx: 11 });
  });

  it("rejeita tamanhos fora da faixa permitida", () => {
    expect(parseTableFonts('{"headerPx":20,"filterPx":8}')).toMatchObject(TABLE_FONTS_DEFAULT);
    expect(parseTableFonts('{"headerPx":11.5,"filterPx":12}')).toMatchObject({ headerPx: 11, filterPx: 12 });
  });

  it("tolera JSON inválido e campos ausentes", () => {
    expect(parseTableFonts("não é json")).toMatchObject(TABLE_FONTS_DEFAULT);
    expect(parseTableFonts('{"headerPx":12}')).toMatchObject({ headerPx: 12, filterPx: 12 });
  });
});

describe("table alignment", () => {
  it("keeps headers and lists independent", async () => {
    const { parseTableFonts, tableAlignVars } = await import("./table-fonts-config");
    const c = parseTableFonts('{"headerH":"center","headerV":"middle","cellH":"left","cellV":"middle"}');
    expect(tableAlignVars(c)).toMatchObject({ "--th-align": "center", "--th-justify": "center", "--td-align": "left", "--td-valign": "middle" });
  });
  it("defaults to today's left/middle alignment for unknown values", async () => {
    const { parseTableFonts } = await import("./table-fonts-config");
    expect(parseTableFonts('{"headerH":"x"}')).toMatchObject({ headerH: "left", headerV: "middle", cellH: "left", cellV: "middle" });
  });
});

describe("header colours", () => {
  it("default keeps today's grey text, no background and light border", async () => {
    const { parseTableFonts, tableAlignVars } = await import("./table-fonts-config");
    expect(tableAlignVars(parseTableFonts(null))).toMatchObject({ "--th-bg": "transparent", "--th-color": "var(--muted-foreground)", "--th-border": "var(--border)" });
  });
  it("offers brand colours (purple, lilac) for header background", async () => {
    const { HEADER_COLORS } = await import("./table-fonts-config");
    expect(HEADER_COLORS.headerBg.map((o) => o.value)).toEqual(expect.arrayContaining(["var(--myio-purple)", "var(--myio-lilac)", "var(--myio-green-tint)"]));
  });
});
