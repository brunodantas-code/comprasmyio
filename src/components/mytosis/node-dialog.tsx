import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { childrenMap, computeProgress, descendantIds, formatDate, rootObjectiveOf, type MytosisNode } from "@/lib/mytosis";
import type { MytosisData } from "./use-mytosis";

export type NodeDialogState =
  | { mode: "edit"; node: MytosisNode }
  | { mode: "create"; kind: "objective" | "task"; parentId: string | null; predecessorId?: string | null; process?: boolean }
  | null;

export function NodeDialog({ state, onClose, data, canEdit }: { state: NodeDialogState; onClose: () => void; data: MytosisData; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const editing = state?.mode === "edit" ? state.node : null;
  const kind = editing?.kind ?? (state?.mode === "create" ? state.kind : "task");
  const parentId = editing?.parent_id ?? (state?.mode === "create" ? state.parentId : null);
  const parentNode = parentId ? data.nodes.find((n) => n.id === parentId) : null;
  const isProcess = editing ? !!editing.is_process : parentNode ? !!parentNode.is_process : state?.mode === "create" && !!state.process;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [responsible, setResponsible] = useState("");
  const [due, setDue] = useState("");
  const [weight, setWeight] = useState("0");
  const [progress, setProgress] = useState("0");
  const [preds, setPreds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!state) return;
    setTitle(editing?.title ?? "");
    setDescription(editing?.description ?? "");
    setResponsible(editing?.responsible_id ?? (state.mode === "create" ? data.userId : ""));
    setDue(editing?.due_date ?? "");
    setWeight(String(editing?.weight ?? 0));
    setProgress(String(editing?.progress ?? 0));
    setPreds(new Set(editing
      ? data.links.filter((l) => l.successor_id === editing.id).map((l) => l.predecessor_id)
      : state.mode === "create" && state.predecessorId ? [state.predecessorId] : []));
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const kids = editing ? childrenMap(data.nodes).get(editing.id) ?? [] : [];
  const computed = editing ? computeProgress(data.nodes).get(editing.id) ?? 0 : 0;
  const siblings = useMemo(() => data.nodes.filter((n) => parentId && n.parent_id === parentId && n.id !== editing?.id), [data.nodes, parentId, editing?.id]);
  const siblingWeight = siblings.reduce((s, n) => s + n.weight, 0);
  const candidates = useMemo(() => {
    if (!parentId) return [];
    const root = rootObjectiveOf(parentId, data.nodes);
    if (!root) return [];
    const scope = descendantIds(root.id, data.nodes);
    const own = editing ? descendantIds(editing.id, data.nodes) : new Set<string>();
    return data.nodes.filter((n) => scope.has(n.id) && !own.has(n.id) && n.kind === "task");
  }, [data.nodes, parentId, editing]);
  const successors = editing ? data.links.filter((l) => l.predecessor_id === editing.id).map((l) => data.nodes.find((n) => n.id === l.successor_id)).filter(Boolean) as MytosisNode[] : [];
  const userOptions = data.users.map((u) => ({ value: u.id, label: u.full_name, keywords: u.email ?? "" }));

  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Informe o título.");
      if (!responsible) throw new Error("Informe o Responsável.");
      if (!due && !isProcess) throw new Error("Informe a Data estimada de conclusão.");
      const w = Number(weight) || 0;
      if (!isProcess && kind === "task" && parentId && siblingWeight + w > 100) throw new Error(`A soma dos pesos passa de 100% (demais tarefas: ${siblingWeight}%).`);
      const row = {
        title: title.trim(), description: description.trim() || null, responsible_id: responsible, due_date: isProcess ? null : due,
        weight: w, progress: kids.length ? editing?.progress ?? 0 : Math.min(100, Math.max(0, Number(progress) || 0)),
      };
      let id = editing?.id;
      if (editing) {
        const { error } = await supabase.from("mytosis_nodes").update(row).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase.from("mytosis_nodes").insert({ ...row, kind, is_process: isProcess, parent_id: parentId, position: siblings.length }).select("id").single();
        if (error) throw error;
        id = created.id;
      }
      const current = new Set(data.links.filter((l) => l.successor_id === id).map((l) => l.predecessor_id));
      const toAdd = [...preds].filter((p) => !current.has(p));
      const toRemove = [...current].filter((p) => !preds.has(p));
      if (toAdd.length) {
        const { error } = await supabase.from("mytosis_links").insert(toAdd.map((p) => ({ predecessor_id: p, successor_id: id! })));
        if (error) throw error;
      }
      for (const p of toRemove) {
        const { error } = await supabase.from("mytosis_links").delete().eq("predecessor_id", p).eq("successor_id", id!);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Box salvo."); queryClient.invalidateQueries({ queryKey: ["mytosis"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("mytosis_nodes").delete().eq("id", editing!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Box excluído."); queryClient.invalidateQueries({ queryKey: ["mytosis"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const label = isProcess ? "Etapa" : kind === "objective" ? "Objetivo" : "Tarefa";
  return (
    <Dialog open={!!state} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-normal">{editing ? `#${editing.locator} — ${label}` : isProcess ? "Nova etapa" : `Novo ${label.toLowerCase()}`}</DialogTitle>
          <DialogDescription>{editing ? `Criado em ${new Date(editing.created_at).toLocaleDateString("pt-BR")}` : `Data de criação: ${new Date().toLocaleDateString("pt-BR")}`}</DialogDescription>
        </DialogHeader>
        <fieldset disabled={!canEdit} className="grid gap-4">
          <div className="grid gap-1.5"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus /></div>
          <div className="grid gap-1.5"><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={isProcess ? "grid gap-1.5 sm:col-span-2" : "grid gap-1.5"}><Label>Responsável</Label><SearchableSelect value={responsible} onChange={setResponsible} options={userOptions} placeholder="Selecione o usuário" disabled={!canEdit} /></div>
            {isProcess ? null : <div className="grid gap-1.5"><Label>Data estimada de conclusão</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>}
          </div>
          {isProcess ? null : <div className="grid gap-4 sm:grid-cols-2">
            {kind === "task" && parentId ? <div className="grid gap-1.5"><Label>Peso sobre o total (%)</Label><Input type="number" min={0} max={100} value={weight} onChange={(e) => setWeight(e.target.value)} /><span className="text-xs text-muted-foreground">Demais tarefas do mesmo box: {siblingWeight}% · disponível {Math.max(0, 100 - siblingWeight)}%</span></div> : null}
            <div className="grid gap-1.5"><Label>% de conclusão</Label>{kids.length ? <p className="h-9 py-2 text-sm text-muted-foreground">{computed}% (calculado pelas tarefas abaixo)</p> : <Input type="number" min={0} max={100} value={progress} onChange={(e) => setProgress(e.target.value)} />}</div>
          </div>}
          {kind === "task" ? (
            <div className="grid gap-1.5">
              <Label>Box predecessor (anterior)</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border border-border p-2">
                {candidates.length ? candidates.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 py-1 text-sm">
                    <Checkbox checked={preds.has(c.id)} onCheckedChange={(v) => setPreds((prev) => { const next = new Set(prev); if (v) next.add(c.id); else next.delete(c.id); return next; })} />
                    <span className="text-muted-foreground">#{c.locator}</span> {c.title}
                  </label>
                )) : <p className="text-sm text-muted-foreground">{isProcess ? "Nenhuma outra etapa neste fluxograma." : "Nenhuma outra tarefa neste objetivo."}</p>}
              </div>
              <span className="text-xs text-muted-foreground">Box sucessor (posterior): {successors.length ? successors.map((s) => `#${s.locator} ${s.title}`).join(", ") : "nenhum"}</span>
            </div>
          ) : null}
          {editing && !isProcess ? <p className="text-xs text-muted-foreground">Prazo atual: {formatDate(editing.due_date)}</p> : null}
        </fieldset>
        <DialogFooter className="gap-2">
          {editing && canEdit ? <Button variant="outline" onClick={() => { if (window.confirm(`Excluir #${editing.locator} e todas as tarefas abaixo dele?`)) remove.mutate(); }} disabled={remove.isPending}>Excluir</Button> : null}
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          {canEdit ? <Button variant="outline" onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
