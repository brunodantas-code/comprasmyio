import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OP_LABELS, isFilterActive, type ColumnFilterValue, type FilterKind } from "@/lib/column-filters";

export type ActiveFilterTag = { key: string; label: string; description: string; remove: () => void };

export function describeColumnFilter(kind: FilterKind, value: ColumnFilterValue | undefined): string {
  if (!value) return "";
  const selected = value.selected === undefined ? "" : value.selected.length
    ? value.selected.length > 2 ? `${value.selected.length} valores selecionados` : value.selected.join(", ")
    : "Nenhum valor selecionado";
  const condition = isFilterActive({ ...value, selected: undefined })
    ? [OP_LABELS[kind].find(option => option.op === value.op)?.label, value.value, value.value2].filter(Boolean).join(" ")
    : "";
  return [selected, condition].filter(Boolean).join(" · ");
}

/** Same visible filter identities and individual removal across every application. */
export function ActiveFilterTags({ items }: { items: ActiveFilterTag[] }) {
  if (!items.length) return null;
  return <div aria-label="Filtros aplicados" className="mb-3 flex min-w-0 flex-wrap justify-end gap-2 text-[length:var(--filter-fs)]">
    {items.map(item => <Badge key={item.key} variant="secondary" className="min-w-0 max-w-full gap-1 font-normal text-[length:var(--filter-fs)]">
      <span className="min-w-0 truncate" title={`${item.label}: ${item.description}`}>{item.label}: {item.description}</span>
      <Button type="button" variant="ghost" size="compactIcon" className="shrink-0" aria-label={`Remover filtro ${item.label}`} title={`Remover filtro ${item.label}`} onClick={item.remove}><X /></Button>
    </Badge>)}
  </div>;
}