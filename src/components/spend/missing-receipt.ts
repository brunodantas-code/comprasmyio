import { z } from 'zod';

// Stored history may still contain both reasons, so parsing stays permissive.
export const missingReceiptReason = z.enum(['lost', 'not_applicable']);
export type MissingReceiptReason = z.infer<typeof missingReceiptReason>;
export const missingReceiptLabels: Record<MissingReceiptReason, string> = {
  lost: 'Não salvei ou perdi o comprovante',
  not_applicable: 'Não se aplica',
};

// The holder may only declare a missing receipt; "Não se aplica" is a Finance
// classification made in Conciliação, never a holder response.
export const missingReceiptDeclaration = z.enum(['lost']);
export type MissingReceiptDeclaration = z.infer<typeof missingReceiptDeclaration>;
export const missingReceiptDeclarations: MissingReceiptDeclaration[] = ['lost'];

export function canDeclareMissingReceipt(holder: string, user: string, receipt: string | null, status: string) {
  return holder === user && receipt === null && status === 'adjustment';
}
