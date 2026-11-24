import type { Delegation, SpendCard } from "./data";

/** Temporary presentation exception while the disputed holder registration is corrected. */
export function receiptDisplayCardsFor(userId: string, cards: SpendCard[]) {
  return cards.filter(c => !(userId === "6ca0eff8-7393-47bc-9054-9001138bcbc2" && c.id === "25a95170-6998-4109-a020-ab102531dff9"));
}

/** Cards a holder may submit receipts to: own card first, then active temporary authorizations. */
export function receiptCardsFor(userId: string, cards: SpendCard[], delegations: Delegation[], today: string) {
  const own = receiptDisplayCardsFor(userId, cards).filter(c => c.holder_id === userId);
  const delegated = cards.filter(c => c.holder_id !== userId && delegations.some(d => d.card_id === c.id && d.delegate_id === userId && !d.revoked_at && d.expires_at >= today));
  return [...own, ...delegated];
}
export const isDelegatedCard = (card: SpendCard | undefined, userId: string, finance: boolean) => !!card && !finance && card.holder_id !== userId;
