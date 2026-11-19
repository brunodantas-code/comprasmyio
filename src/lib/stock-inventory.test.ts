import { describe, expect, it } from 'vitest';
import { addInventoryCounter, INVENTORY_COUNT_DEFAULT, INVENTORY_COUNT_STEP, inventoryCountDifference, inventoryDifference, isInventoryCount, nextInventoryDate } from './stock-inventory';
describe('confirmação do inventário', () => {
  it('primeiro inventário não tem divergência mesmo com saldo zero', () => expect(inventoryCountDifference(100, 0, false)).toBeNull());
  it('inventário seguinte mostra a divergência encontrada', () => expect(inventoryCountDifference(100, 90, true)).toBe(10));
  it('quantidade começa em 1', () => expect(INVENTORY_COUNT_DEFAULT).toBe(1));
  it('quantidade avança de unidade em unidade', () => expect(INVENTORY_COUNT_STEP).toBe(1));
  it('não aceita a contagem fracionária 0.001', () => expect(() => inventoryDifference(0.001, 0)).toThrow());
  it('não confirma uma quantidade fracionária digitada', () => expect(isInventoryCount(1.5)).toBe(false));
  it('permite confirmar zero unidades', () => expect(isInventoryCount(0)).toBe(true));
  it('não calcula divergência para uma fração ainda não salva', () => expect(inventoryCountDifference(0.001, 0, true)).toBeNull());
});
describe('inventariantes', () => {
  it('permite adicionar um usuário cadastrado', () => expect(addInventoryCounter([], 'Leonardo Roedel')).toEqual(['Leonardo Roedel']));
  it('permite adicionar outro nome sem substituir os selecionados', () => expect(addInventoryCounter(['Leonardo Roedel'], ' Maria Silva ')).toEqual(['Leonardo Roedel', 'Maria Silva']));
  it('não duplica a mesma pessoa ao adicionar novamente', () => expect(addInventoryCounter(['Leonardo Roedel'], ' leonardo roedel ')).toEqual(['Leonardo Roedel']));
  it('não adiciona nome vazio', () => expect(addInventoryCounter([], ' ')).toEqual([]));
});
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