import { describe, expect, it } from "vitest";
import { statementTotal } from "./statement-total";

describe("total de todos os movimentos da fatura", () => {
  it("soma os movimentos importados em centavos", () => {
    expect(statementTotal([16.97, 22.81, 31.49])).toBe(71.27);
  });
  it("inclui créditos e estornos com seu sinal original", () => {
    expect(statementTotal([100, -25.50, 0, 10.44])).toBe(84.94);
  });
  it("retorna zero quando não há movimentos", () => {
    expect(statementTotal([])).toBe(0);
  });
});