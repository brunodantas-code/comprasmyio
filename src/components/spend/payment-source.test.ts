import { describe, expect, it } from "vitest";
import { paymentSourceNeedsCard, paymentSourceOptions, reimbursementPaymentDate, reimbursementStatusLabel } from "./payment-source";

describe("formas de pagamento sem cartão ativo", () => {
  it("reembolso pago em dinheiro ou cartão pessoal não exige cartão myio", () => {
    expect(paymentSourceNeedsCard("reimbursement")).toBe(false);
    expect(paymentSourceNeedsCard("myio_card")).toBe(true);
    expect(paymentSourceNeedsCard("advance")).toBe(false);
  });

  it("sem cartão, reembolso continua disponível e a opção Cartão myio some", () => {
    expect(paymentSourceOptions(false, false)).toEqual(["reimbursement"]);
    expect(paymentSourceOptions(false, true)).toEqual(["reimbursement", "advance"]);
    expect(paymentSourceOptions(true, false)).toEqual(["myio_card", "reimbursement"]);
  });
});

describe("situação de reembolsos no Spend", () => {
  it("reembolso Pago no Supply mostra Pago e a data registrada", () => {
    const receipt = { reimbursement_order_id: "order-1", reimbursement_paid: true, reimbursement_payment_date: "2026-11-27" };
    expect(reimbursementStatusLabel(receipt)).toBe("Pago");
    expect(reimbursementPaymentDate(receipt)).toBe("2026-11-27");
  });

  it("reembolso ainda não pago mantém a solicitação e não inventa data", () => {
    const receipt = { reimbursement_order_id: "order-1", reimbursement_paid: false, reimbursement_payment_date: "2026-11-27" };
    expect(reimbursementStatusLabel(receipt)).toBe("Solicitado no Supply");
    expect(reimbursementPaymentDate(receipt)).toBeNull();
  });

  it("reembolso ainda não enviado ao Supply mantém a ação de solicitar", () => {
    expect(reimbursementStatusLabel({ reimbursement_order_id: null })).toBe("Reembolso a solicitar");
  });
});
