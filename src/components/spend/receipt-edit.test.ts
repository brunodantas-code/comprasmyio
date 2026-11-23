import { describe, expect, it } from "vitest";
import { canEditSpendReceipt, canDeleteSpendReceipt } from "./receipt-edit";

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
  it("preserva comprovantes já vinculados a uma solicitação do Supply", () => {
    expect(canEditSpendReceipt({ holder_id: "holder", status: "pending", reimbursement_order_id: "order" }, "holder")).toBe(false);
  });
});

describe("exclusão pessoal de comprovantes e reembolsos", () => {
  it("permite excluir o comprovante próprio pendente", () => {
    expect(canDeleteSpendReceipt({ holder_id: "holder", status: "pending" }, "holder")).toBe(true);
  });
  it("não permite excluir comprovante de outro portador", () => {
    expect(canDeleteSpendReceipt({ holder_id: "other", status: "pending" }, "holder")).toBe(false);
  });
  it("preserva comprovantes e lançamentos aprovados", () => {
    expect(canDeleteSpendReceipt({ holder_id: "holder", status: "approved" }, "holder")).toBe(false);
    expect(canDeleteSpendReceipt({ holder_id: "holder", status: "matched" }, "holder", true)).toBe(false);
  });
  it("preserva reembolsos enviados ao Supply", () => {
    expect(canDeleteSpendReceipt({ holder_id: "holder", status: "pending", reimbursement_order_id: "order" }, "holder")).toBe(false);
  });
});