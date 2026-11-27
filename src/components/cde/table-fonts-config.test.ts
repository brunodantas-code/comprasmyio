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

  it("oferece tamanho de fonte para títulos e subtítulos", () => {
    expect(parseTableFonts(undefined)).toMatchObject({ titlePx: 16, subPx: 14 });
    expect(parseTableFonts('{"titlePx":18,"subPx":12}')).toMatchObject({ titlePx: 18, subPx: 12 });
    expect(parseTableFonts('{"titlePx":30,"subPx":4}')).toMatchObject({ titlePx: 16, subPx: 14 });
  });

  it("emite as variáveis de tamanho de títulos e subtítulos", async () => {
    const { parseTableFonts, tableAlignVars } = await import("./table-fonts-config");
    expect(tableAlignVars(parseTableFonts('{"titlePx":18,"subPx":12}'))).toMatchObject({ "--title-fs": "18px", "--sub-fs": "12px" });
    expect(tableAlignVars(parseTableFonts(null))).toMatchObject({ "--title-fs": "16px", "--sub-fs": "14px" });
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

describe("list colours", () => {
  it("parses list colours independently of headers and emits row variables", async () => {
    const { parseTableFonts, tableAlignVars } = await import("./table-fonts-config");
    const c = parseTableFonts('{"headerBg":"padrao","cellBg":"lilas","cellText":"x"}');
    expect(c.headerBg).toBe("padrao");
    expect(c.cellText).toBe("padrao");
    const v = tableAlignVars(c);
    expect(v["--td-color"]).toBe("var(--foreground)");
    expect(v["--th-bg"]).toBe("transparent");
  });
});

it("mantém listas em 12px e transmite o tamanho escolhido no CDE", async () => {
  const { tableAlignVars } = await import("./table-fonts-config");
  expect(tableAlignVars(parseTableFonts(null))["--td-fs"]).toBe("12px");
  expect(tableAlignVars(parseTableFonts('{"cellPx":13}'))["--td-fs"]).toBe("13px");
});
