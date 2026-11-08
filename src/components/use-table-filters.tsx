import { useState } from "react";
import { ColumnFilter } from "@/components/column-filter";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const menu = <TableFilterMenu rows={rows} columns={columns} filters={filters} onChange={(key, value) => setFilters(current => ({ ...current, [key]: value }))} clear={() => setFilters({})} />;
  return { filtered, header, control, menu, searchText, active: active.length, clear: () => setFilters({}) };
}

function TableFilterMenu<T>({ rows, columns, filters, onChange, clear }: {
  rows: readonly T[];
  columns: FilterColumn<T>[];
  filters: Record<string, ColumnFilterValue | undefined>;
  onChange: (key: string, value: ColumnFilterValue | undefined) => void;
  clear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(columns[0]?.key ?? "");
  const column = columns.find(c => c.key === key) ?? columns[0];
  const active = columns.filter(c => isFilterActive(filters[c.key])).length;
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button variant="ghost" size="compactIcon" aria-label="Filtrar atas" title={active ? `Filtros (${active} ativos)` : "Filtros"} className={`!bg-transparent ${active ? "!text-primary" : "!text-foreground hover:!text-primary"}`}><Filter className="!size-5 stroke-[1.8]" /></Button></PopoverTrigger>
    <PopoverContent align="start" className="w-[min(18rem,calc(100vw-2rem))] space-y-3 p-3">
      <Select value={column?.key} onValueChange={setKey}>
        <SelectTrigger aria-label="Tipo de filtro" className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{columns.map(c => <SelectItem key={c.key} value={c.key}>{c.label}{isFilterActive(filters[c.key]) ? " •" : ""}</SelectItem>)}</SelectContent>
      </Select>
      {column && <ColumnFilter key={column.key} label={column.label} kind={column.kind ?? "text"} values={rows.map(row => column.display?.(row) ?? String(column.value(row) ?? ""))} value={filters[column.key]} onChange={value => onChange(column.key, value)} embedded onClose={() => setOpen(false)} />}
      {active > 0 && <Button variant="outline" size="sm" className="h-7 w-full text-xs" onClick={clear}>Limpar todos os filtros ({active})</Button>}
    </PopoverContent>
  </Popover>;
}