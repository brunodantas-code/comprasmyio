import { describe, expect, it } from "vitest";
import { receiptBelongsToView } from "./receipt-visibility";

const view = { tab: "receipts", cardId: "card-ativo", holderId: "joao" };

describe("reembolsos na lista de Meus comprovantes", () => {
  it("reembolso pago com cartão pessoal aparece mesmo com o cartão de origem inativo ou outro cartão", () => {
    expect(receiptBelongsToView({ payment_source: "reimbursement", holder_id: "joao", card_id: "card-inativo" }, view)).toBe(true);
    expect(receiptBelongsToView({ payment_source: "reimbursement", holder_id: "joao", card_id: null }, view)).toBe(true);
    expect(receiptBelongsToView({ payment_source: "reimbursement", holder_id: "joao", card_id: "card-ativo" }, view)).toBe(true);
  });

  it("reembolso de outra pessoa não aparece na lista", () => {
    expect(receiptBelongsToView({ payment_source: "reimbursement", holder_id: "andre", card_id: null }, view)).toBe(false);
  });

  it("comprovante de cartão myio só aparece junto ao próprio cartão", () => {
    expect(receiptBelongsToView({ payment_source: "myio_card", holder_id: "joao", card_id: "card-ativo" }, view)).toBe(true);
    expect(receiptBelongsToView({ payment_source: "myio_card", holder_id: "joao", card_id: "card-inativo" }, view)).toBe(false);
  });

  it("reembolso não entra na conciliação da fatura", () => {
    expect(receiptBelongsToView({ payment_source: "reimbursement", holder_id: "joao", card_id: "card-inativo" }, { ...view, tab: "reconcile" })).toBe(false);
  });
});
