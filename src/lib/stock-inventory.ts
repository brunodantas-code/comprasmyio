import { addMonths, format, parseISO } from 'date-fns';

export const INVENTORY_INTERVALS = [0, 1, 3, 6, 12] as const;
export function nextInventoryDate(date: string, months: number): string | null {
  if (!INVENTORY_INTERVALS.some(value => value === months)) throw new Error('Recorrência inválida');
  return months === 0 ? null : format(addMonths(parseISO(date), months), 'yyyy-MM-dd');
}
export function inventoryDifference(counted: number, balance: number) {
  if (!Number.isFinite(counted) || counted < 0) throw new Error('Contagem inválida');
  return Math.round((counted - balance) * 1000) / 1000;
}