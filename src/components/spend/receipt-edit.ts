export function canEditSpendReceipt(receipt: { holder_id: string; status: string; reimbursement_order_id?: string | null }, userId: string, approvedLine = false) {
  return receipt.holder_id === userId && receipt.status !== "approved" && !receipt.reimbursement_order_id && !approvedLine;
}