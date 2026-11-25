import { describe, expect, it } from "vitest";
import { paymentSourceNeedsCard, paymentSourceOptions } from "./payment-source";

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
