import { compareColumnValues, type SortValue } from "@/lib/column-sort";
import type { FilterKind } from "@/lib/column-filters";
export type CardSort = { key: string; direction: "asc" | "desc" };
export function sortIndicatorCards<T>(rows: readonly T[], sort: CardSort | undefined, columns: { key: string; kind?: FilterKind; value: (row: T) => SortValue }[]): T[] {
  const column = columns.find(c => c.key === sort?.key);
  if (!sort || !column) return [...rows];
  return rows.map((row,index)=>({row,index})).sort((a,b)=>compareColumnValues(column.kind ?? "text",column.value(a.row),column.value(b.row),sort.direction) || a.index-b.index).map(x=>x.row);
}