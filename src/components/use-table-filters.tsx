import { useState } from "react";
import { ColumnFilter } from "@/components/column-filter";
import { isFilterActive, matchesColumnFilter, type ColumnFilterValue, type FilterKind } from "@/lib/column-filters";

export type FilterColumn<T> = {
  key: string;
  label: string;
  kind?: FilterKind;
  value: (row: T) => string | number | null | undefined;
  display?: (row: T) => string;
};

/** Filters authorized source rows, not DOM text, so callers can reuse results for exports. */
export function useTableFilters<T>(rows: readonly T[], columns: FilterColumn<T>[]) {
  const [filters, setFilters] = useState<Record<string, ColumnFilterValue | undefined>>({});
  const active = columns.filter((column) => isFilterActive(filters[column.key]));
  const display = (column: FilterColumn<T>, row: T) => column.display?.(row) ?? String(column.value(row) ?? "");
  const filtered = rows.filter((row) => active.every((column) =>
    matchesColumnFilter(column.kind ?? "text", column.value(row), display(column, row), filters[column.key]),
  ));
  const control = (key: string, showLabel = false) => {
    const column = columns.find((entry) => entry.key === key);
    if (!column) return null;
    return <ColumnFilter label={column.label} kind={column.kind ?? "text"} values={rows.map((row) => display(column, row))}
      value={filters[key]} showLabel={showLabel} onChange={(value) => setFilters((current) => ({ ...current, [key]: value }))} />;
  };
  const header = (key: string) => {
    const column = columns.find((entry) => entry.key === key);
    return <span className="inline-flex items-center gap-1 whitespace-nowrap">{column?.label}{control(key)}</span>;
  };
  const searchText = (key: string) => filters[key]?.op === "contains" ? filters[key]?.value ?? "" : "";
  return { filtered, header, control, searchText, active: active.length, clear: () => setFilters({}) };
}