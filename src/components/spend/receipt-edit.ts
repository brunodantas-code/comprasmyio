export function canDeleteSpendReceipt(receipt: { holder_id: string; status: string; reimbursement_order_id?: string | null }, userId: string, approvedLine = false) {
  return receipt.holder_id === userId && receipt.status !== "approved" && !receipt.reimbursement_order_id && !approvedLine;
}
/** Financeiro edits receipts of any card; holders only their own. Approved/Supply-linked stay locked. */
export function canEditSpendReceipt(receipt: { holder_id: string; status: string; reimbursement_order_id?: string | null }, userId: string, approvedLine = false, finance = false) {
  return (receipt.holder_id === userId || finance) && receipt.status !== "approved" && !receipt.reimbursement_order_id && !approvedLine;
}
