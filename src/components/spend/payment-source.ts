import { z } from "zod";

export const paymentSourceSchema = z.enum(["myio_card", "reimbursement"], { message: "Informe Cartão myio ou Reembolso" });
export type PaymentSource = z.infer<typeof paymentSourceSchema>;
export const paymentSourceLabels = { myio_card: "Cartão myio", reimbursement: "Reembolso" } as const;
export function isCardReceipt(receipt: { payment_source: string }) {
  return receipt.payment_source === "myio_card";
}