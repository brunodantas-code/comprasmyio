import { describe, expect, it } from "vitest";
import { supplierKey } from "./supplier-key";
describe("De-Para de fornecedores", () => {
  it("ignora caixa e espaços extras no mesmo fornecedor", () => {
    expect(supplierKey("  IOF   Cartão ")).toBe(supplierKey("iof cartão"));
  });
  it("não confunde fornecedores com nomes parcialmente iguais", () => {
    expect(supplierKey("Fornecedor A")).not.toBe(supplierKey("Fornecedor AB"));
  });
});