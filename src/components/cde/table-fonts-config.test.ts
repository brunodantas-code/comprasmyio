import { describe, expect, it } from "vitest";
import { TABLE_FONTS_DEFAULT, parseTableFonts } from "./table-fonts-config";

describe("parseTableFonts", () => {
  it("usa o padrão 11/12 quando não há padrão salvo", () => {
    expect(parseTableFonts(undefined)).toEqual({ headerPx: 11, filterPx: 12 });
    expect(parseTableFonts(null)).toEqual(TABLE_FONTS_DEFAULT);
    expect(parseTableFonts("")).toEqual(TABLE_FONTS_DEFAULT);
  });

  it("aceita tamanhos válidos salvos no CDE", () => {
    expect(parseTableFonts('{"headerPx":13,"filterPx":14}')).toEqual({ headerPx: 13, filterPx: 14 });
    expect(parseTableFonts('{"headerPx":10,"filterPx":11}')).toEqual({ headerPx: 10, filterPx: 11 });
  });

  it("rejeita tamanhos fora da faixa permitida", () => {
    expect(parseTableFonts('{"headerPx":20,"filterPx":8}')).toEqual(TABLE_FONTS_DEFAULT);
    expect(parseTableFonts('{"headerPx":11.5,"filterPx":12}')).toEqual({ headerPx: 11, filterPx: 12 });
  });

  it("tolera JSON inválido e campos ausentes", () => {
    expect(parseTableFonts("não é json")).toEqual(TABLE_FONTS_DEFAULT);
    expect(parseTableFonts('{"headerPx":12}')).toEqual({ headerPx: 12, filterPx: 12 });
  });
});
