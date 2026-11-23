import { describe, expect, it } from "vitest";
import { canEditSpendReceipt } from "./receipt-edit";

describe("edição pessoal de comprovantes", () => {
  it("permite editar o próprio comprovante antes da aprovação", () => {
    expect(canEditSpendReceipt({ holder_id: "holder", status: "pending" }, "holder")).toBe(true);
  });
  it("não permite editar comprovantes de outro portador", () => {
    expect(canEditSpendReceipt({ holder_id: "other", status: "pending" }, "holder")).toBe(false);
  });
  it("preserva comprovantes aprovados", () => {
    expect(canEditSpendReceipt({ holder_id: "holder", status: "approved" }, "holder")).toBe(false);
    expect(canEditSpendReceipt({ holder_id: "holder", status: "matched" }, "holder", true)).toBe(false);
  });
});