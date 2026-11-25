import { z } from "zod";

export const paymentSourceSchema = z.enum(["myio_card", "reimbursement", "advance"], { message: "Informe Cartão myio, Reembolso ou Adiantamento" });
export type PaymentSource = z.infer<typeof paymentSourceSchema>;
export const paymentSourceLabels = { myio_card: "Cartão myio", reimbursement: "Reembolso", advance: "Adiantamento" } as const;
export function isCardReceipt(receipt: { payment_source: string }) {
  return receipt.payment_source === "myio_card";
}
export function isAdvanceReceipt(receipt: { payment_source: string }) {
  return receipt.payment_source === "advance";
}
export function paymentSourceLabel(source: string) {
  return source === "advance" ? paymentSourceLabels.advance : source === "myio_card" ? paymentSourceLabels.myio_card : paymentSourceLabels.reimbursement;
}
/** Only the myio card option needs a card; reimbursement (cash or personal card) and advance do not. */
export function paymentSourceNeedsCard(source: string) {
  return source === "myio_card";
}
/** Options a person can pick: myio card only when one is available, reimbursement always, advance when one is open. */
export function paymentSourceOptions(hasCard: boolean, hasOpenAdvance: boolean) {
  return [...(hasCard ? ["myio_card"] : []), "reimbursement", ...(hasOpenAdvance ? ["advance"] : [])];
}
