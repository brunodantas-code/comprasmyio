import type { Delegation, SpendCard } from "./data";

/** Cards shown in a holder's receipt views; registered holders are authoritative. */
export function receiptDisplayCardsFor(_userId: string, cards: SpendCard[]) {
  return cards.filter(c => c.active !== false);
}

/** Cards a holder may submit receipts to: own card first, then active temporary authorizations. */
export function receiptCardsFor(userId: string, cards: SpendCard[], delegations: Delegation[], today: string) {
  const own = receiptDisplayCardsFor(userId, cards).filter(c => c.holder_id === userId);
  const delegated = cards.filter(c => c.active !== false && c.holder_id !== userId && delegations.some(d => d.card_id === c.id && d.delegate_id === userId && !d.revoked_at && d.expires_at >= today));
  return [...own, ...delegated];
}
export const isDelegatedCard = (card: SpendCard | undefined, userId: string, finance: boolean) => !!card && !finance && card.holder_id !== userId;
