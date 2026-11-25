/** A reimbursement belongs to the person who paid it, never to a card: it is listed for its holder whatever the card's state. */
export function receiptBelongsToView(
  r: { payment_source: string; holder_id: string; card_id: string | null },
  view: { tab: string; cardId: string | null; holderId: string },
) {
  if (r.payment_source === "reimbursement") return view.tab === "receipts" && r.holder_id === view.holderId;
  return r.card_id === view.cardId;
}
