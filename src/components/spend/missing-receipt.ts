import { z } from 'zod';
export const missingReceiptReason = z.enum(['lost', 'not_applicable']);
export type MissingReceiptReason = z.infer<typeof missingReceiptReason>;
export const missingReceiptLabels: Record<MissingReceiptReason, string> = {
  lost: 'Não salvei ou perdi o comprovante',
  not_applicable: 'Não se aplica',
};
export function canDeclareMissingReceipt(holder: string, user: string, receipt: string | null, status: string) {
  return holder === user && receipt === null && status === 'adjustment';
}