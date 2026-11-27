import { useState } from "react";
import { TableFilterMenu, TableFilterSummary } from "@/components/use-table-filters";
import { type ColumnFilterValue } from "@/lib/column-filters";
import { Badge } from "@/components/ui/badge";

const rows = [{ status: "Em atendimento", app: "Supply" }, { status: "Atendido", app: "Code" }, { status: "Aguardando resposta", app: "Legal" }];
const columns = [{ key: "status", label: "Situação", value: (row: typeof rows[number]) => row.status }, { key: "app", label: "Aplicativo", value: (row: typeof rows[number]) => row.app }];

export function CdeFilterStandard() {
  const [filters, setFilters] = useState<Record<string, ColumnFilterValue | undefined>>({ status: { selected: ["Aguardando resposta", "Em atendimento"] } });
  const change = (key: string, value: ColumnFilterValue | undefined) => setFilters(current => ({ ...current, [key]: value }));
  return <section className="space-y-3 border-b border-border px-4 py-4" aria-label="Padrão de filtros múltiplos">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-medium">Filtros múltiplos com identificação</h3><Badge variant="outline">Padrão aplicado em todos os apps</Badge></div>
    <div className="flex justify-end erp-list-toolbar"><TableFilterMenu triggerLabel="Filtros" rows={rows} columns={columns} filters={filters} onChange={change} clear={() => setFilters({})} /></div>
    <TableFilterSummary columns={columns} filters={filters} onChange={change} />
  </section>;
}