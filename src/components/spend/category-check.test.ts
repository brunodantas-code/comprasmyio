import { describe, expect, it } from "vitest";
import { categoryChangeNeedsConfirmation, categoryChangeMessage, receiptCategoryOverride } from "./category-check";
describe("conferência de categoria alterada", () => {
  it("pede confirmação só quando troca a sugestão", () => {
    expect(categoryChangeNeedsConfirmation("combustivel", "alimentacao")).toBe(true);
    expect(categoryChangeNeedsConfirmation("combustivel", "combustivel")).toBe(false);
    expect(categoryChangeNeedsConfirmation(null, "alimentacao")).toBe(false);
  });
  it("recomenda observação apenas quando está vazia", () => {
    expect(categoryChangeMessage("Combustível", "Alimentação", false)).toContain("Registre no campo de observações");
    expect(categoryChangeMessage("Combustível", "Alimentação", true)).not.toContain("Registre");
  });
  it("identifica a troca pelo histórico mais recente", () => {
    const logs = [
      { created_at: "2026-11-24T10:00:00Z", details: { receipt_id: "r1", suggested_category: "combustivel" } },
      { created_at: "2026-11-24T11:00:00Z", details: { receipt_id: "r1", before: {}, after: { suggested_category: "alimentacao" } } },
    ];
    expect(receiptCategoryOverride(logs.slice(0, 1), "r1", "alimentacao")).toEqual({ suggested: "combustivel", chosen: "alimentacao" });
    expect(receiptCategoryOverride(logs, "r1", "alimentacao")).toBeNull();
  });
});
