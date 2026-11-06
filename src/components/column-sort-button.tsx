import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SortDirection } from "@/lib/column-sort";

export function ColumnSortButton({ label, direction, onClick, compact = false }: { label: string; direction?: SortDirection; onClick: () => void; compact?: boolean }) {
  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ArrowUpDown;
  const hint = direction === "asc" ? "crescente; clicar para decrescente" : direction === "desc" ? "decrescente; clicar para restaurar" : "clicar para crescente";
  return <Button type="button" variant="ghost" size="icon" className={`${compact ? "size-4" : "size-5"} shrink-0 p-0 shadow-none ${direction ? "!text-primary" : "!text-muted-foreground hover:!text-primary"}`} aria-label={`Ordenar ${label}`} title={`Ordenar ${label}: ${hint}`} onClick={onClick}><Icon className="size-3" /></Button>;
}