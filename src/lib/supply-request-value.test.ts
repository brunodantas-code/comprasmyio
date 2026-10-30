import { describe, expect, it } from "vitest";
import { invalidSupplyRequestValueIndex } from "./supply-request-value";

describe("required value for new Supply requests", () => {
  for (const model of ["servicos", "materiais", "viagens"]) {
    it(`${model} requires a populated positive value`, () => {
      for (const value of ["", null, undefined, "0", "-1", "invalid", Infinity]) {
        expect(invalidSupplyRequestValueIndex(model, [value])).toBe(0);
      }
      expect(invalidSupplyRequestValueIndex(model, [])).toBe(0);
      expect(invalidSupplyRequestValueIndex(model, ["150.50"])).toBe(-1);
    });
  }
  it("requires value for every material, not just a positive total", () => {
    expect(invalidSupplyRequestValueIndex("materiais", ["100", "0"])).toBe(1);
    expect(invalidSupplyRequestValueIndex("materiais", ["100", "25"])).toBe(-1);
  });
  it("does not extend the rule to other request models", () => {
    for (const model of ["rh", "pagamento", "reembolso", "dispositivos", "importacao"]) {
      expect(invalidSupplyRequestValueIndex(model, [""])).toBe(-1);
    }
  });
});