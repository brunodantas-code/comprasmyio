/** An unset selection may default; an explicitly cleared selection must stay empty. */
export function selectedSpendCard<T extends { id: string }>(cards: T[], selectedId: string | undefined, preferred?: T): T | undefined {
  if (selectedId === '') return undefined;
  return cards.find(card => card.id === selectedId) ?? preferred ?? cards[0];
}