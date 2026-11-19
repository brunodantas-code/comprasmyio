import { describe, expect, it } from 'vitest';
import { stockComponentTotals } from './stock-totals';
describe('totais de componentes', () => {
  const rows = [{ balance: 0 }, { balance: 5 }, { balance: 100 }, { balance: 0 }];
  it('conta componentes cadastrados, não unidades', () => expect(stockComponentTotals(rows).registered).toBe(4));
  it('conta componentes com saldo positivo', () => expect(stockComponentTotals(rows).positive).toBe(2));
  it('conta componentes com saldo exatamente zero', () => expect(stockComponentTotals([...rows, { balance: -1 }]).zero).toBe(2));
});