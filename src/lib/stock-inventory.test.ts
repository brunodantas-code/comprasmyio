import { describe, expect, it } from 'vitest';
import { inventoryDifference, nextInventoryDate } from './stock-inventory';
describe('recorrência do inventário', () => {
  it('mensal', () => expect(nextInventoryDate('2026-11-19', 1)).toBe('2026-12-19'));
  it('trimestral', () => expect(nextInventoryDate('2026-11-19', 3)).toBe('2027-02-19'));
  it('semestral', () => expect(nextInventoryDate('2026-11-19', 6)).toBe('2027-05-19'));
  it('anual', () => expect(nextInventoryDate('2026-11-19', 12)).toBe('2027-11-19'));
  it('preserva o fim do mês', () => expect(nextInventoryDate('2026-01-31', 1)).toBe('2026-02-28'));
  it('sem recorrência', () => expect(nextInventoryDate('2026-11-19', 0)).toBeNull());
});
describe('contagem física', () => {
  it('zero permite baixa total', () => expect(inventoryDifference(0, 10)).toBe(-10));
  it('diferença positiva não soma novamente a contagem', () => expect(inventoryDifference(15, 10)).toBe(5));
  it('não aceita saldo negativo', () => expect(() => inventoryDifference(-1, 10)).toThrow());
});