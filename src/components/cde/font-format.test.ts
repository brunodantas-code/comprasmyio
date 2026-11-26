import { describe, expect, it } from "vitest";
import { fontFormatCss, parseFontFormat } from "./font-format";

describe("formatação de fonte", () => {
  it("aplica Semi-Negrito como peso 600", () => expect(fontFormatCss(parseFontFormat({ weight: "600" })).fontWeight).toBe("600"));
  it("aplica Negrito como peso 700", () => expect(fontFormatCss(parseFontFormat({ weight: "700" })).fontWeight).toBe("700"));
  it("combina Itálico com outros formatos", () => expect(fontFormatCss(parseFontFormat({ weight: "600", italic: true }))).toMatchObject({ fontWeight: "600", fontStyle: "italic" }));
  it("combina Sublinhado com Itálico", () => expect(fontFormatCss(parseFontFormat({ underline: true, italic: true }))).toMatchObject({ textDecorationLine: "underline", fontStyle: "italic" }));
  it("preserva a aparência de configurações antigas", () => expect(fontFormatCss(parseFontFormat(undefined))).toEqual({}));
});