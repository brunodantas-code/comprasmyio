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
import { childrenMap, computeBoxNumbers, computeProgress, descendantIds, formatDate, rootObjectiveOf, type MytosisNode } from "@/lib/mytosis";
import type { MytosisData } from "./use-mytosis";
import { BORDERS, ConnectorGlyph, FILLS, LINK_STYLES, SHAPES, ShapeSvg, type BorderKey, type FillKey, type LinkStyle, type ShapeKey } from "./shapes";
import { cn } from "@/lib/utils";
import { ChecklistText } from "./checklist-text";
import { AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical } from "lucide-react";

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
  const [shape, setShape] = useState<ShapeKey>("process");
  const [fillKey, setFillKey] = useState<FillKey>("none");
  const [borderKey, setBorderKey] = useState<BorderKey>("green-mid");
  const [linkStyle, setLinkStyle] = useState<LinkStyle>("arrow");
  const [titleSize, setTitleSize] = useState(18);
  const [descriptionSize, setDescriptionSize] = useState(11);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("left");
  const [verticalAlign, setVerticalAlign] = useState<"top" | "center" | "bottom">("center");

  useEffect(() => {
    if (!state) return;
    setTitle(editing?.title ?? "");
    setTitleSize(editing?.title_font_size ?? 18);
    setDescriptionSize(editing?.description_font_size ?? 11);
    setTextAlign(editing?.text_align ?? "left");
    setVerticalAlign(editing?.text_vertical_align ?? "center");
    setDescription(editing?.description ?? "");
    setResponsible(editing?.responsible_id ?? (state.mode === "create" ? data.userId : ""));
    setDue(editing?.due_date ?? "");
    setWeight(String(editing?.weight ?? 0));
    setProgress(String(editing?.progress ?? 0));
    setShape((editing?.shape as ShapeKey) ?? "process");
    setFillKey((editing?.fill_color as FillKey) ?? "none");
    setBorderKey((editing?.border_color as BorderKey) ?? "green-mid");
    setLinkStyle(((editing && data.links.find((l) => l.successor_id === editing.id)?.style) as LinkStyle) ?? "arrow");
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
      if (![titleSize, descriptionSize].every((size) => Number.isInteger(size) && size >= 10 && size <= 32)) throw new Error("Informe tamanhos de fonte entre 10 e 32 px.");
      if (!responsible) throw new Error("Informe o Responsável.");
      if (!due && !isProcess) throw new Error("Informe a Data estimada de conclusão.");
      const w = Number(weight) || 0;
      if (!isProcess && kind === "task" && parentId && siblingWeight + w > 100) throw new Error(`A soma dos pesos passa de 100% (demais tarefas: ${siblingWeight}%).`);
      const row = {
        title: title.trim(), description: description.trim() || null, responsible_id: responsible, due_date: isProcess ? null : due,
        shape, fill_color: fillKey, border_color: borderKey,
        title_font_size: titleSize, description_font_size: descriptionSize, text_align: textAlign, text_vertical_align: verticalAlign,
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
      if (!id) throw new Error("Box não encontrado.");
      const current = new Set(data.links.filter((l) => l.successor_id === id).map((l) => l.predecessor_id));
      const toAdd = [...preds].filter((p) => !current.has(p));
      const toRemove = [...current].filter((p) => !preds.has(p));
      if (toAdd.length) {
        const { error } = await supabase.from("mytosis_links").insert(toAdd.map((p) => ({ predecessor_id: p, successor_id: id, style: linkStyle })));
        if (error) throw error;
      }
      const keep = [...preds].filter((p) => current.has(p));
      if (keep.length) {
        const { error } = await supabase.from("mytosis_links").update({ style: linkStyle }).eq("successor_id", id).in("predecessor_id", keep);
        if (error) throw error;
      }
      for (const p of toRemove) {
        const { error } = await supabase.from("mytosis_links").delete().eq("predecessor_id", p).eq("successor_id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Box salvo."); queryClient.invalidateQueries({ queryKey: ["mytosis"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error("Box não encontrado.");
      const { error } = await supabase.from("mytosis_nodes").delete().eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Box excluído."); queryClient.invalidateQueries({ queryKey: ["mytosis"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const numbers = useMemo(() => computeBoxNumbers(data.nodes, data.links), [data.nodes, data.links]);
  const label = isProcess ? "Etapa" : kind === "objective" ? "Objetivo" : "Tarefa";
  return (
    <Dialog open={!!state} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-normal">{editing ? `${numbers.get(editing.id) ?? editing.locator} — ${label}` : isProcess ? "Nova etapa" : `Novo ${label.toLowerCase()}`}</DialogTitle>
          <DialogDescription>{editing ? `Criado em ${new Date(editing.created_at).toLocaleDateString("pt-BR")}` : `Data de criação: ${new Date().toLocaleDateString("pt-BR")}`}</DialogDescription>
        </DialogHeader>
        <fieldset disabled={!canEdit} className="grid gap-4">
          <div className="grid gap-1.5"><Label>Título</Label><ChecklistText label="Título" value={title} onChange={setTitle} maxLength={200} hint="Redija o nome do box." autoFocus /></div>
          <div className="grid gap-2 rounded-xl border border-border bg-muted/40 p-3">
            <div className="grid gap-1"><Label className="text-xs text-muted-foreground">Forma</Label>
              <div className="flex flex-wrap gap-1.5">{SHAPES.map((s) => (
                <button key={s.key} type="button" title={s.label} aria-label={s.label} aria-pressed={shape === s.key} onClick={() => setShape(s.key)} className={cn("flex w-16 flex-col items-center justify-center gap-0.5 rounded-md border bg-card px-1 py-1.5 transition-colors", shape === s.key ? "border-primary bg-primary/10" : "border-border hover:border-primary/60")}>
                  <ShapeSvg shape={s.key} fill="transparent" stroke="var(--foreground)" className="h-5 w-8" />
                  <span className="w-full truncate text-center text-[10px] leading-tight text-muted-foreground">{s.label}</span>
                </button>))}</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1"><Label className="text-xs text-muted-foreground">Fundo</Label>
                <div className="flex flex-wrap gap-1.5">{FILLS.map((f) => <button key={f.key} type="button" title={f.label} aria-label={`Fundo ${f.label}`} aria-pressed={fillKey === f.key} onClick={() => setFillKey(f.key)} className={cn("h-7 w-7 rounded-full border border-border", fillKey === f.key && "ring-2 ring-primary ring-offset-1")} style={{ background: f.color }} />)}</div>
              </div>
              <div className="grid gap-1"><Label className="text-xs text-muted-foreground">Borda</Label>
                <div className="flex flex-wrap gap-1.5">{BORDERS.map((b) => <button key={b.key} type="button" title={b.label} aria-label={`Borda ${b.label}`} aria-pressed={borderKey === b.key} onClick={() => setBorderKey(b.key)} className={cn("h-7 w-7 rounded-full border-[3px] bg-card", borderKey === b.key && "ring-2 ring-primary ring-offset-1")} style={{ borderColor: b.color }} />)}</div>
              </div>
            </div>
            {kind === "task" ? <div className="grid gap-1"><Label className="text-xs text-muted-foreground">Conector de entrada (vindo do box predecessor)</Label>
              <div className="flex flex-wrap gap-1.5">{LINK_STYLES.map((l) => <button key={l.key} type="button" title={l.label} aria-label={l.label} aria-pressed={linkStyle === l.key} onClick={() => setLinkStyle(l.key)} className={cn("flex h-8 items-center gap-2 rounded-md border bg-card px-2 text-xs", linkStyle === l.key ? "border-primary bg-primary/10" : "border-border hover:border-primary/60")}><ConnectorGlyph style={l.key} color="var(--foreground)" />{l.label}</button>)}</div>
            </div> : null}
          </div>
          <div className="grid gap-1.5"><Label>Descrição</Label><ChecklistText label="Descrição" value={description} onChange={setDescription} multiline hint="Redija a descrição." /></div>
          <div className="grid gap-3 border-t border-border pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label htmlFor="box-title-size">Fonte do título (px)</Label><Input id="box-title-size" type="number" min={10} max={32} step={1} value={titleSize} onChange={(e) => setTitleSize(Number(e.target.value))} /></div>
              <div className="grid gap-1.5"><Label htmlFor="box-description-size">Fonte da descrição (px)</Label><Input id="box-description-size" type="number" min={10} max={32} step={1} value={descriptionSize} onChange={(e) => setDescriptionSize(Number(e.target.value))} /></div>
            </div>
            <div className="flex flex-wrap gap-5">
              <div className="grid gap-1.5"><Label className="text-xs text-muted-foreground">Alinhamento horizontal</Label><div className="flex gap-1">{([
                { value: "left", label: "À esquerda", Icon: AlignLeft }, { value: "center", label: "Centralizado", Icon: AlignCenter }, { value: "right", label: "À direita", Icon: AlignRight },
              ] as const).map(({ value, label, Icon }) => <Button key={value} type="button" variant="ghost" size="icon" title={label} aria-label={label} aria-pressed={textAlign === value} onClick={() => setTextAlign(value)} className={cn("text-primary", textAlign === value && "bg-primary/10 ring-1 ring-primary/40")}><Icon className="h-4 w-4" /></Button>)}</div></div>
              <div className="grid gap-1.5"><Label className="text-xs text-muted-foreground">Alinhamento vertical</Label><div className="flex gap-1">{([
                { value: "top", label: "Superior", Icon: AlignStartVertical }, { value: "center", label: "Centro vertical", Icon: AlignCenterVertical }, { value: "bottom", label: "Inferior", Icon: AlignEndVertical },
              ] as const).map(({ value, label, Icon }) => <Button key={value} type="button" variant="ghost" size="icon" title={label} aria-label={label} aria-pressed={verticalAlign === value} onClick={() => setVerticalAlign(value)} className={cn("text-primary", verticalAlign === value && "bg-primary/10 ring-1 ring-primary/40")}><Icon className="h-4 w-4" /></Button>)}</div></div>
            </div>
          </div>
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
                    <span className="text-muted-foreground">{numbers.get(c.id) ?? c.locator}</span> {c.title}
                  </label>
                )) : <p className="text-sm text-muted-foreground">{isProcess ? "Nenhuma outra etapa neste fluxograma." : "Nenhuma outra tarefa neste objetivo."}</p>}
              </div>
              <span className="text-xs text-muted-foreground">Box sucessor (posterior): {successors.length ? successors.map((s) => `${numbers.get(s.id) ?? s.locator} ${s.title}`).join(", ") : "nenhum"}</span>
            </div>
          ) : null}
          {editing && !isProcess ? <p className="text-xs text-muted-foreground">Prazo atual: {formatDate(editing.due_date)}</p> : null}
        </fieldset>
        <DialogFooter className="gap-2">
          {editing && canEdit ? <Button variant="outline" onClick={() => { if (window.confirm(`Excluir ${numbers.get(editing.id) ?? editing.locator} e todas as tarefas abaixo dele?`)) remove.mutate(); }} disabled={remove.isPending}>Excluir</Button> : null}
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          {canEdit ? <Button variant="outline" onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
