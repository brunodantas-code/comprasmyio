import { addMonths, format, parseISO } from 'date-fns';

export const INVENTORY_INTERVALS = [0, 1, 3, 6, 12] as const;
export const INVENTORY_COUNT_DEFAULT = 1;
export const INVENTORY_COUNT_STEP = 1;
export function isInventoryCount(counted: number | null): counted is number {
  return counted !== null && Number.isSafeInteger(counted) && counted >= 0;
}
export function inventoryCountDifference(counted: number | null, balance: number, hasPreviousInventory: boolean) {
  return !isInventoryCount(counted) || !hasPreviousInventory ? null : inventoryDifference(counted, balance);
}
export function addInventoryCounter(names: string[], name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed || names.some(existing => existing.trim().toLocaleLowerCase('pt-BR') === trimmed.toLocaleLowerCase('pt-BR'))) return names;
  return [...names, trimmed];
}
export function nextInventoryDate(date: string, months: number): string | null {
  if (!INVENTORY_INTERVALS.some(value => value === months)) throw new Error('Recorrência inválida');
  return months === 0 ? null : format(addMonths(parseISO(date), months), 'yyyy-MM-dd');
}
export function inventoryDifference(counted: number, balance: number) {
  if (!isInventoryCount(counted)) throw new Error('Informe uma quantidade inteira, igual ou maior que zero');
  return Math.round((counted - balance) * 1000) / 1000;
}