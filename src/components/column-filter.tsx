import { useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  EMPTY_LABEL, OP_LABELS, isFilterActive, normalizeText,
  type ColumnFilterValue, type FilterKind, type FilterOp,
} from "@/lib/column-filters";

/** Botão de filtro de coluna no estilo Excel: condição + lista de valores com busca. */
export function ColumnFilter({
  label, kind, values, value, onChange, showLabel = false, compact = false,
}: {
  label: string;
  kind: FilterKind;
  /** Valores distintos exibidos na lista (texto como aparece na tabela). */
  values: string[];
  value: ColumnFilterValue | undefined;
  onChange: (v: ColumnFilterValue | undefined) => void;
  showLabel?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const active = isFilterActive(value);
  const distinct = useMemo(() => {
    const set = new Set(values.map((v) => (v.trim() === "" ? EMPTY_LABEL : v)));
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  }, [values]);
  const shown = distinct.filter((v) => normalizeText(v).includes(normalizeText(search)));
  const selected = value?.selected ?? distinct;
  const allOn = selected.length >= distinct.length && distinct.every((v) => selected.includes(v));
  const op = value?.op ?? OP_LABELS[kind][0].op;
  const needsValue = op !== "empty" && op !== "not_empty";
  const inputType = kind === "date" ? "date" : "text";

  const setSelected = (next: string[]) => {
    const isAll = distinct.every((v) => next.includes(v));
    onChange({ ...value, selected: isAll ? undefined : next });
  };
  const toggle = (v: string) => setSelected(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {showLabel ? (
          <Button type="button" variant="outline" size="sm" className={`h-7 gap-1 px-2 text-xs !bg-transparent ${active ? "border-primary !text-primary" : ""}`}>
            <Filter className="size-3" />{label}
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="icon" aria-label={`Filtrar ${label}`} title={`Filtrar ${label}`}
            className={`${compact ? "size-4" : "size-5"} shrink-0 p-0 align-middle !bg-transparent shadow-none ${active ? "!text-primary" : "!text-muted-foreground hover:!text-primary"}`}>
            <Filter className="size-3" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(18rem,calc(100vw-2rem))] space-y-2 p-3 text-left font-sans text-sm font-normal">
        <div className="text-xs font-medium text-muted-foreground">Filtrar {label}</div>
        <Select value={op} onValueChange={(v) => onChange({ ...value, op: v as FilterOp })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {OP_LABELS[kind].map((o) => <SelectItem key={o.op} value={o.op}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {needsValue && (
          <div className="flex gap-2">
            <Input type={inputType} inputMode={kind === "number" ? "decimal" : undefined} value={value?.value ?? ""}
              onChange={(e) => onChange({ ...value, op, value: e.target.value })}
              placeholder={kind === "number" ? "Valor" : "Digite..."} className="h-8 text-xs" />
            {op === "between" && (
              <Input type={inputType} inputMode={kind === "number" ? "decimal" : undefined} value={value?.value2 ?? ""}
                onChange={(e) => onChange({ ...value, op, value2: e.target.value })}
                placeholder="e" className="h-8 text-xs" />
            )}
          </div>
        )}
        {distinct.length > 0 && (
          <div className="space-y-1 border-t border-border pt-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar na lista" className="h-8 text-xs" />
            <div className="max-h-48 space-y-0.5 overflow-y-auto">
              <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs hover:bg-accent">
                <Checkbox checked={allOn} onCheckedChange={() => setSelected(allOn ? [] : distinct)} />
                (Selecionar tudo)
              </label>
              {shown.map((v) => (
                <label key={v} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs hover:bg-accent">
                  <Checkbox checked={selected.includes(v)} onCheckedChange={() => toggle(v)} />
                  <span className="break-words">{v}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => { onChange(undefined); setSearch(""); }}>Limpar</Button>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>Concluir</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
