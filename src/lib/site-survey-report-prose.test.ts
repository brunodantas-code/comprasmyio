import { describe, expect, test } from "bun:test";
import { lowerLeadingPreposition, uninformedRegisterSentences } from "./site-survey-report-prose";

const joined = (parts: { text: string }[]) => parts.map((part) => part.text).join("");

describe("uninformedRegisterSentences", () => {
  test("says the register type was not informed when nobody answered about its condition", () => {
    expect(joined(uninformedRegisterSentences("Não informado", null)))
      .toBe("Não foi informado o tipo de registro existente. ");
  });

  test("keeps the approved sentence when the condition was answered", () => {
    expect(joined(uninformedRegisterSentences("Não informado", "funcional")))
      .toBe("O tipo de registro existente não foi informado, mas encontra-se funcional. ");
  });

  test("reports type and condition together when both were left out", () => {
    expect(joined(uninformedRegisterSentences("Não informado", "Não informado")))
      .toBe("O tipo e a condição do registro não foram informados. ");
  });

  test("writes nothing when the register type was informed", () => {
    expect(uninformedRegisterSentences("Gaveta", "funcional")).toEqual([]);
    expect(uninformedRegisterSentences(null, null)).toEqual([]);
  });
});

describe("lowerLeadingPreposition", () => {
  test("lowercases only the preposition that opens a flow rate", () => {
    expect(lowerLeadingPreposition("Até 5 m³/h")).toBe("até 5 m³/h");
    expect(lowerLeadingPreposition("De 5 a 10 m³/h")).toBe("de 5 a 10 m³/h");
    expect(lowerLeadingPreposition("DN20")).toBe("DN20");
  });
});
