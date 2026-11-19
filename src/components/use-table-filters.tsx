import { X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ColumnFilter } from "@/components/column-filter";
import { CdeButton } from "@/components/cde/cde-button";
import { ActiveFilterTags, describeColumnFilter } from "@/components/active-filter-tags";
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
  renderFilter?: (value: ColumnFilterValue | undefined, onChange: (value: ColumnFilterValue | undefined) => void) => ReactNode;
};

/** Filters authorized source rows, not DOM text, so callers can reuse results for exports. */
export function useTableFilters<T>(rows: readonly T[], columns: FilterColumn<T>[]) {
  const [filters, setFilters] = useState<Record<string, ColumnFilterValue | undefined>>({});
  const active = columns.filter((column) => isFilterActive(filters[column.key]));
  const display = (column: FilterColumn<T>, row: T) => column.display?.(row) ?? String(column.value(row) ?? "");
  const filtered = rows.filter((row) => active.every((column) =>
    matchesColumnFilter(column.kind ?? "text", column.value(row), display(column, row), filters[column.key]),
  ));
  const menu = <TableFilterMenu rows={rows} columns={columns} filters={filters} onChange={(key, value) => setFilters(current => ({ ...current, [key]: value }))} clear={() => setFilters({})} />;
  let controlShown = false;
  const control = (key: string) => {
    if (!columns.some((entry) => entry.key === key) || controlShown) return null;
    controlShown = true;
    return menu;
  };
  // Filtro consolidado: um único funil, exibido junto ao primeiro cabeçalho renderizado.
  let menuKey: string | undefined;
  const header = (key: string) => {
    const column = columns.find((entry) => entry.key === key);
    menuKey ??= key;
    return <span className="inline-flex max-w-full flex-nowrap items-center gap-1"><span className="min-w-0 break-words">{column?.label}</span>{key === menuKey ? <span className="inline-flex shrink-0">{menu}</span> : null}</span>;
  };
  const searchText = (key: string) => filters[key]?.op === "contains" ? filters[key]?.value ?? "" : "";
  const summary = <TableFilterSummary columns={columns} filters={filters} onChange={(key, value) => setFilters(current => ({ ...current, [key]: value }))} />;
  return { filtered, filters, header, control, menu, summary, searchText, active: active.length, setFilter: (key: string, value: ColumnFilterValue | undefined) => setFilters(current => ({ ...current, [key]: value })), clear: () => setFilters({}) };
}

export function TableFilterSummary<T>({ columns, filters, onChange }: { columns: FilterColumn<T>[]; filters: Record<string, ColumnFilterValue | undefined>; onChange: (key: string, value: ColumnFilterValue | undefined) => void }) {
  return <ActiveFilterTags items={columns.filter(column => isFilterActive(filters[column.key])).map(column => ({ key: column.key, label: column.label, description: describeColumnFilter(column.kind ?? "text", filters[column.key]), remove: () => onChange(column.key, undefined) }))} />;
}

export function TableFilterMenu<T>({ rows, columns, filters, onChange, clear, triggerLabel }: {
  rows: readonly T[];
  columns: FilterColumn<T>[];
  filters: Record<string, ColumnFilterValue | undefined>;
  onChange: (key: string, value: ColumnFilterValue | undefined) => void;
  clear: () => void;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(columns[0]?.key ?? "");
  const column = columns.find(c => c.key === key) ?? columns[0];
  const active = columns.filter(c => isFilterActive(filters[c.key])).length;
  const activeColumns = columns.filter(c => isFilterActive(filters[c.key]));
  const describe = (c: FilterColumn<T>) => describeColumnFilter(c.kind ?? "text", filters[c.key]);
  return <span className="inline-flex shrink-0 items-center gap-1 text-[length:var(--filter-fs)] text-muted-foreground"><Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><CdeButton group="filter" screen="components/use-table-filters.tsx" active={!!active} aria-label="Filtros" title={active ? `Filtros (${active} ativos)` : "Filtros"} className="!bg-transparent gap-2 [&_svg]:!size-5 [&_svg]:stroke-[1.8]">{triggerLabel}</CdeButton></PopoverTrigger>
    <PopoverContent align="start" className="max-h-[var(--radix-popover-content-available-height)] w-[min(18rem,calc(100vw-2rem))] overflow-y-auto space-y-3 p-3">
      <Select value={column?.key} onValueChange={setKey}>
        <SelectTrigger aria-label="Tipo de filtro" className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{columns.map(c => <SelectItem key={c.key} value={c.key}>{c.label}{isFilterActive(filters[c.key]) ? " •" : ""}</SelectItem>)}</SelectContent>
      </Select>
      {column && (column.renderFilter ? column.renderFilter(filters[column.key], value => onChange(column.key, value)) : <ColumnFilter key={column.key} label={column.label} kind={column.kind ?? "text"} values={rows.map(row => column.display?.(row) ?? String(column.value(row) ?? ""))} value={filters[column.key]} onChange={value => onChange(column.key, value)} embedded onClose={() => setOpen(false)} />)}
      {activeColumns.length > 0 && <div className="space-y-1 border-t pt-2"><p className="text-xs text-muted-foreground">Filtros combinados ({activeColumns.length})</p>{activeColumns.map(c => <div key={c.key} className="flex min-w-0 items-center gap-1 text-xs"><Button type="button" variant="ghost" className="!h-auto !min-w-0 !w-auto flex-1 justify-start text-left font-normal" onClick={() => setKey(c.key)} title={`${c.label}: ${describe(c)}`}><span className="min-w-0 truncate">{c.label}: {describe(c)}</span></Button><Button type="button" variant="ghost" size="compactIcon" aria-label={`Remover filtro ${c.label}`} onClick={() => onChange(c.key, undefined)}><X /></Button></div>)}</div>}
      {active > 0 && <Button variant="outline" size="sm" className="h-7 w-full text-xs" onClick={clear}>Limpar todos os filtros ({active})</Button>}
    </PopoverContent>
  </Popover>{active > 0 ? <span className="tabular-nums" title={`${active} filtros combinados`}>({active})</span> : null}</span>;
}