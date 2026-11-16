import { ArrowDown, ArrowUp, ArrowUpDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SortDirection } from "@/lib/column-sort";

export type TableSorting = { key: string; direction: SortDirection };

export function TableSortMenu({ columns, value, onChange }: {
  columns: { key: string; label: string }[];
  value?: TableSorting;
  onChange: (value: TableSorting | undefined) => void;
}) {
  const selected = columns.find(column => column.key === value?.key);
  const chooseDirection = (direction: SortDirection) => {
    const key = value?.key ?? columns[0]?.key;
    if (key) onChange({ key, direction });
  };
  return <Popover>
    <PopoverTrigger asChild>
      <Button type="button" variant="ghost" size="sm" aria-label="Ordenar" title={selected ? `Ordenar: ${selected.label}, ${value?.direction === "desc" ? "decrescente" : "crescente"}` : "Ordenar"} className="gap-2 !w-auto !min-w-max shrink-0">
        <ArrowUpDown className="size-4" /> Ordenar
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-[min(18rem,calc(100vw-2rem))] space-y-3 p-3">
      <Select value={value?.key ?? ""} onValueChange={key => onChange({ key, direction: value?.direction ?? "asc" })}>
        <SelectTrigger aria-label="Coluna para ordenar"><SelectValue placeholder="Selecionar coluna" /></SelectTrigger>
        <SelectContent>{columns.map(column => <SelectItem key={column.key} value={column.key}>{column.label}</SelectItem>)}</SelectContent>
      </Select>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" size="sm" aria-pressed={!!value && value.direction === "asc"} onClick={() => chooseDirection("asc")}><ArrowUp className="size-4" /> Crescente</Button>
        <Button type="button" variant="ghost" size="sm" aria-pressed={value?.direction === "desc"} onClick={() => chooseDirection("desc")}><ArrowDown className="size-4" /> Decrescente</Button>
      </div>
      <Button type="button" variant="ghost" size="sm" disabled={!value} onClick={() => onChange(undefined)}><RotateCcw className="size-4" /> Restaurar ordem</Button>
    </PopoverContent>
  </Popover>;
}