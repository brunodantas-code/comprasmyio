export function canEditSpendReceipt(receipt: { holder_id: string; status: string }, userId: string, approvedLine = false) {
  return receipt.holder_id === userId && receipt.status !== "approved" && !approvedLine;
}