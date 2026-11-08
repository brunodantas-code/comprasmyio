import { CdeButton } from "@/components/cde/cde-button";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { computeBoxNumbers, computeProgress, formatDate, groupPendings, rootObjectiveOf } from "@/lib/mytosis";
import type { MytosisData } from "./use-mytosis";
import type { NodeDialogState } from "./node-dialog";

export function OkrsTab({ data, canEdit, openDialog, onOpenObjective, onLocate }: {
  data: MytosisData; canEdit: boolean; openDialog: (s: NodeDialogState) => void; onOpenObjective: (id: string) => void; onLocate: (locator: number) => void;
}) {
  const [by, setBy] = useState<"responsible" | "date">("responsible");
  const numbers = useMemo(() => computeBoxNumbers(data.nodes, data.links), [data.nodes, data.links]);
  const progress = useMemo(() => computeProgress(data.nodes), [data.nodes]);
  const nameOf = (id: string | null) => data.users.find((u) => u.id === id)?.full_name ?? "—";
  const objectives = data.nodes.filter((n) => !n.parent_id && !n.is_process);
  const groups = useMemo(() => groupPendings(data.nodes, by, nameOf), [data.nodes, by, data.users]); // eslint-disable-line react-hooks/exhaustive-deps
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-lg font-normal">Objetivos (OKRs)</h2>
          {canEdit ? <CdeButton group="plus" screen="components/mytosis/okrs-tab.tsx" onClick={() => openDialog({ mode: "create", kind: "objective", parentId: null })} aria-label="Novo objetivo" title="Novo objetivo"></CdeButton> : null}
        </div>
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Nº</TableHead><TableHead>Objetivo</TableHead><TableHead>Responsável</TableHead><TableHead>Prazo</TableHead><TableHead>Tarefas</TableHead><TableHead className="w-48">Conclusão</TableHead></TableRow></TableHeader>
            <TableBody>
              {objectives.length ? objectives.map((o) => {
                const pct = progress.get(o.id) ?? 0;
                const count = data.nodes.filter((n) => n.kind === "task" && !n.is_process && rootObjectiveOf(n.id, data.nodes)?.id === o.id).length;
                return (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => onOpenObjective(o.id)}>
                    <TableCell className="text-muted-foreground">{numbers.get(o.id) ?? o.locator}</TableCell>
                    <TableCell className="hover:text-primary">{o.title}</TableCell>
                    <TableCell>{nameOf(o.responsible_id)}</TableCell>
                    <TableCell>{formatDate(o.due_date)}</TableCell>
                    <TableCell>{count}</TableCell>
                    <TableCell><div className="flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary/10"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div><span className="w-10 text-right text-xs text-muted-foreground/70">{pct}%</span></div></TableCell>
                  </TableRow>
                );
              }) : <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Nenhum objetivo cadastrado.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-normal">Consolidação de pendências</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" aria-pressed={by === "responsible"} onClick={() => setBy("responsible")} className={cn(by === "responsible" && "!bg-primary !text-primary-foreground")}>Por responsável</Button>
            <Button variant="outline" size="sm" aria-pressed={by === "date"} onClick={() => setBy("date")} className={cn(by === "date" && "!bg-primary !text-primary-foreground")}>Por data</Button>
          </div>
        </div>
        {groups.length ? groups.map((g) => (
          <div key={g.key || "none"} className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5"><span>{g.label}</span><span className="text-xs text-muted-foreground">{g.items.length} pendente(s)</span></div>
            <Table>
              <TableHeader><TableRow><TableHead className="w-20">Nº</TableHead><TableHead>Tarefa</TableHead><TableHead>Objetivo</TableHead><TableHead>{by === "responsible" ? "Prazo" : "Responsável"}</TableHead><TableHead className="w-24 text-right">Conclusão</TableHead></TableRow></TableHeader>
              <TableBody>
                {g.items.map((t) => {
                  const late = !!t.due_date && t.due_date < today;
                  return (
                    <TableRow key={t.id} className="cursor-pointer" onClick={() => onLocate(t.locator)}>
                      <TableCell className="text-muted-foreground">{numbers.get(t.id) ?? t.locator}</TableCell>
                      <TableCell className="hover:text-primary">{t.title}</TableCell>
                      <TableCell className="text-muted-foreground">{rootObjectiveOf(t.id, data.nodes)?.title ?? "—"}</TableCell>
                      <TableCell className={cn(by === "responsible" && late && "text-destructive")}>{by === "responsible" ? formatDate(t.due_date) : nameOf(t.responsible_id)}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground/70">{progress.get(t.id) ?? 0}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )) : <p className="py-8 text-center text-muted-foreground">Nenhuma tarefa pendente.</p>}
      </section>
    </div>
  );
}
