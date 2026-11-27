import { describe, expect, it } from 'vitest';
import { selectedSpendCard } from './card-selection';

describe('Spend card selection', () => {
  const first = { id: 'first' };
  const preferred = { id: 'preferred' };
  const cards = [first, preferred];

  it('keeps an explicitly cleared card empty instead of selecting the first card again', () => {
    expect(selectedSpendCard(cards, '')).toBeUndefined();
    expect(selectedSpendCard(cards, '', preferred)).toBeUndefined();
  });

  it('preserves the initial default and allows selecting a card after clearing', () => {
    expect(selectedSpendCard(cards, undefined)).toBe(first);
    expect(selectedSpendCard(cards, undefined, preferred)).toBe(preferred);
    expect(selectedSpendCard(cards, 'first', preferred)).toBe(first);
    expect(selectedSpendCard(cards, 'preferred')).toBe(preferred);
  });
});