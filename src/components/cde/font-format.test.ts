import { describe, expect, it } from "vitest";
import { fontFormatCss, parseFontFormat, toggleFontFormat } from "./font-format";

describe("formatação de fonte", () => {
  it("aplica Semi-Negrito como peso 600", () => expect(fontFormatCss(parseFontFormat({ weight: "600" })).fontWeight).toBe("600"));
  it("aplica Negrito como peso 700", () => expect(fontFormatCss(parseFontFormat({ weight: "700" })).fontWeight).toBe("700"));
  it("combina Itálico com outros formatos", () => expect(fontFormatCss(parseFontFormat({ weight: "600", italic: true }))).toMatchObject({ fontWeight: "600", fontStyle: "italic" }));
  it("combina Sublinhado com Itálico", () => expect(fontFormatCss(parseFontFormat({ underline: true, italic: true }))).toMatchObject({ textDecorationLine: "underline", fontStyle: "italic" }));
  it("preserva a aparência de configurações antigas", () => expect(fontFormatCss(parseFontFormat(undefined))).toEqual({}));
  for (const option of ["600", "700"] as const) it(`remove peso ${option} no segundo clique e retorna ao normal`, () => {
    const active = toggleFontFormat({}, option);
    expect(active.weight).toBe(option);
    expect(toggleFontFormat(active, option).weight).toBe("400");
  });
  for (const option of ["italic", "underline"] as const) it(`remove ${option} no segundo clique sem perder os demais formatos`, () => {
    const active = toggleFontFormat({ weight: "700" }, option);
    expect(active[option]).toBe(true);
    expect(toggleFontFormat(active, option)).toEqual({ weight: "700", [option]: false });
  });
  it("remove também o seminegrito herdado", () => expect(toggleFontFormat({}, "600", "600").weight).toBe("400"));
});