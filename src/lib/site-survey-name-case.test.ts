import { describe, expect, it } from "vitest";
import { surveyNameCase } from "./site-survey-name-case";

describe("Aa dos nomes do Site Survey", () => {
  it("preserva maiúsculas personalizadas e a sigla AR", () => {
    expect(surveyNameCase("Provincia do Pão (AR)", true)).toBe("Provincia do Pão (AR)");
  });
  it("converte nomes importados inteiramente em maiúsculas", () => {
    expect(surveyNameCase("LOJA EXEMPLO", true)).toBe("Loja exemplo");
  });
  it("mantém o original com Aa desligado", () => {
    expect(surveyNameCase("LOJA EXEMPLO", false)).toBe("LOJA EXEMPLO");
  });
});