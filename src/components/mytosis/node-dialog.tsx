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
import { NodeConversation } from "./node-conversation";
import { boxTitleLimit, boxDescriptionLimit } from "@/lib/mytosis-title";
import { TextFormatEditor } from "./text-format-editor";
import { FormatColorOptions } from "./format-color-options";
import { TITLE_COLORS, type TitleColorKey } from "./title-colors";
import { NodePreview } from "./node-preview";
import { firstName } from "./use-mytosis";
import { ColorOptions } from "./color-options";
import { NodeAttachments, uploadNodeAttachments } from "./node-attachments";
import { initialStageFormat, sameFormat, standardForShape, canEditBoxLayout, type BoxFormat } from "@/lib/mytosis-format";
import { initialNodeShape, nodeFlowLink, requiresNodeResponsible } from "@/lib/mytosis-editor";

export type NodeDialogState =
  | { mode: "edit"; node: MytosisNode }
  | { mode: "create"; kind: "objective" | "task"; parentId: string | null; predecessorId?: string | null; formatSourceId?: string; process?: boolean; wrapId?: string }
  | null;

export function NodeDialog({ state, onClose, data, canEdit }: { state: NodeDialogState; onClose: () => void; data: MytosisData; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const canStyle = canEditBoxLayout(data.role);
  const editing = state?.mode === "edit" ? state.node : null;
  const kind = editing?.kind ?? (state?.mode === "create" ? state.kind : "task");
  const parentId = editing?.parent_id ?? (state?.mode === "create" ? state.parentId : null);
  const parentNode = parentId ? data.nodes.find((n) => n.id === parentId) : null;
  const isProcess = editing ? !!editing.is_process : parentNode ? !!parentNode.is_process : state?.mode === "create" && !!state.process;
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [attachmentsBusy, setAttachmentsBusy] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [responsible, setResponsible] = useState("");
  const [due, setDue] = useState("");
  const [weight, setWeight] = useState("0");
  const [progress, setProgress] = useState("0");
  const [linked, setLinked] = useState("");
  const [isLinked, setIsLinked] = useState(false);
  const [preds, setPreds] = useState<Set<string>>(new Set());
  const [shape, setShape] = useState<ShapeKey>("process");
  const [fillKey, setFillKey] = useState<FillKey>("none");
  const [borderKey, setBorderKey] = useState<BorderKey>("green-mid");
  const [linkStyle, setLinkStyle] = useState<LinkStyle>("arrow");
  const [titleSize, setTitleSize] = useState(18);
  const [titleColor, setTitleColor] = useState<TitleColorKey | null>(null);
  const [controlColor, setControlColor] = useState<TitleColorKey | null>(null);
  const [descriptionSize, setDescriptionSize] = useState(11);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("left");
  const [verticalAlign, setVerticalAlign] = useState<"top" | "center" | "bottom">("center");
  const setVisualFormat = (format: BoxFormat) => {
    setShape(format.shape as ShapeKey); setFillKey(format.fill_color as FillKey); setBorderKey(format.border_color as BorderKey);
    setTitleSize(format.title_font_size); setDescriptionSize(format.description_font_size);
    setTitleColor(format.title_color as TitleColorKey | null); setControlColor(format.control_color as TitleColorKey | null);
    setTextAlign(format.text_align); setVerticalAlign(format.text_vertical_align);
  };
  const chooseShape = (next: ShapeKey) => setVisualFormat(standardForShape(data.shapeFormats, data.defaultFormat, next));
  const titleLimit = boxTitleLimit(data.box.width, titleSize, shape);
  const titleTooLong = title.trim().length > titleLimit;
  const descriptionLimit = boxDescriptionLimit(data.box.width, data.box.height, descriptionSize, titleSize, shape);
  const descriptionTooLong = description.length > descriptionLimit;

  useEffect(() => {
    if (!state) return;
    setPendingFiles([]); setCreatedId(null);
    const sourceId = state.mode === "create" ? state.formatSourceId ?? state.predecessorId ?? state.parentId : null;
    const format: Partial<BoxFormat> | undefined = editing ? initialStageFormat(data.nodes, editing, sourceId) as Partial<BoxFormat> : data.defaultFormat;
    setTitle(editing?.title ?? "");
    setTitleSize(format?.title_font_size ?? 18);
    setTitleColor(TITLE_COLORS.find((item) => item.key === format?.title_color)?.key ?? null);
    setControlColor(TITLE_COLORS.find((item) => item.key === format?.control_color)?.key ?? null);
    setDescriptionSize(format?.description_font_size ?? 11);
    setTextAlign(format?.text_align ?? "left");
    setVerticalAlign(format?.text_vertical_align ?? "center");
    setDescription(editing?.description ?? "");
    setResponsible(editing?.responsible_id ?? (state.mode === "create" ? data.userId : ""));
    setDue(editing?.due_date ?? "");
    setWeight(String(editing?.weight ?? 0));
    setProgress(String(editing?.progress ?? 0));
    setShape(initialNodeShape(isProcess, parentId, editing?.shape ?? null, format?.shape ?? "process") as ShapeKey);
    setLinked(editing?.linked_node_id ?? ""); setIsLinked(!!editing?.linked_node_id);
    setFillKey((format?.fill_color as FillKey) ?? "none");
    setBorderKey((format?.border_color as BorderKey) ?? "green-mid");
    setLinkStyle(((editing && data.links.find((l) => l.successor_id === editing.id)?.style) as LinkStyle) ?? "arrow");
    if (!editing) setVisualFormat(standardForShape(data.shapeFormats, data.defaultFormat, initialNodeShape(isProcess, parentId, null, data.defaultFormat.shape)));
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
      if (titleTooLong) throw new Error(`O título permite até ${titleLimit} caracteres para este box. Use a Descrição para as demais informações.`);
      if (descriptionTooLong) throw new Error(`A descrição permite até ${descriptionLimit} caracteres para este box. Reduza o texto ou ajuste o tamanho do box e da fonte.`);
      if (![titleSize, descriptionSize].every((size) => Number.isInteger(size) && size >= 10 && size <= 32)) throw new Error("Informe tamanhos de fonte entre 10 e 32 px.");
      if (isProcess && isLinked && !linked) throw new Error("Selecione o box do fluxograma que dispara este fluxo.");
      if (requiresNodeResponsible(isProcess) && !responsible) throw new Error("Informe o Responsável.");
      if (!due && !isProcess) throw new Error("Informe a Data estimada de conclusão.");
      const w = Number(weight) || 0;
      if (!isProcess && kind === "task" && parentId && siblingWeight + w > 100) throw new Error(`A soma dos pesos passa de 100% (demais tarefas: ${siblingWeight}%).`);
      const row = {
        title: title.trim(), description: description.trim() || null, responsible_id: responsible || null, due_date: isProcess ? null : due,
        shape, fill_color: fillKey, border_color: borderKey, control_color: controlColor,
        title_font_size: titleSize, title_color: titleColor, description_font_size: descriptionSize, text_align: textAlign, text_vertical_align: verticalAlign,
        linked_node_id: nodeFlowLink(isProcess, isLinked, linked),
        custom_format: !canStyle && editing && shape === editing.shape ? editing.custom_format ?? false : !sameFormat({ shape, fill_color: fillKey, border_color: borderKey, title_font_size: titleSize, description_font_size: descriptionSize, text_align: textAlign, text_vertical_align: verticalAlign, title_color: titleColor, control_color: controlColor }, standardForShape(data.shapeFormats, data.defaultFormat, shape)),
        weight: w, progress: kids.length ? editing?.progress ?? 0 : Math.min(100, Math.max(0, Number(progress) || 0)),
      };
      let id = editing?.id ?? createdId;
      if (editing) {
        const { error } = await supabase.from("mytosis_nodes").update(row).eq("id", editing.id);
        if (error) throw error;
      } else if (createdId) {
        const { error } = await supabase.from("mytosis_nodes").update(row).eq("id", createdId);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase.from("mytosis_nodes").insert({ ...row, kind, is_process: isProcess, parent_id: parentId, position: siblings.length }).select("id").single();
        if (error) throw error;
        id = created.id; setCreatedId(created.id);
        if (state?.mode === "create" && state.wrapId) {
          const { error: wrapError } = await supabase.rpc("wrap_mytosis_node", { _new_id: created.id, _node_id: state.wrapId });
          if (wrapError) throw wrapError;
        }
      }
      if (!id) throw new Error("Box não encontrado.");
      if (pendingFiles.length) { await uploadNodeAttachments(id, pendingFiles); setPendingFiles([]); }
      const current = new Set(data.links.filter((l) => l.successor_id === id).map((l) => l.predecessor_id));
      const toAdd = [...preds].filter((p) => !current.has(p));
      const toRemove = [...current].filter((p) => !preds.has(p));
      if (toAdd.length) {
        const { error } = await supabase.from("mytosis_links").insert(toAdd.map((p) => ({ predecessor_id: p, successor_id: id, style: canStyle ? linkStyle : "arrow" })));
        if (error) throw error;
      }
      const keep = [...preds].filter((p) => current.has(p));
      if (canStyle && keep.length) {
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
      const { error } = await supabase.from("mytosis_nodes").delete().eq("id", editing.id).select("id").single();
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Box excluído."); queryClient.invalidateQueries({ queryKey: ["mytosis"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const numbers = useMemo(() => computeBoxNumbers(data.nodes, data.links), [data.nodes, data.links]);
  const ownRootId = editing ? rootObjectiveOf(editing.id, data.nodes)?.id : parentId ? rootObjectiveOf(parentId, data.nodes)?.id : null;
  const linkOptions = data.nodes.filter((n) => n.is_process && !!n.parent_id && n.id !== editing?.id && (!ownRootId || rootObjectiveOf(n.id, data.nodes)?.id !== ownRootId))
    .map((n) => ({ value: n.id, label: `${numbers.get(n.id) ?? n.locator} ${n.title}`, hint: rootObjectiveOf(n.id, data.nodes)?.title, group: n.shape === "terminal" ? "Início/fim" : "Demais boxes" }))
    .sort((a, b) => (a.group === b.group ? a.label.localeCompare(b.label, "pt-BR", { numeric: true }) : a.group === "Início/fim" ? -1 : 1));
  const label = isProcess ? (parentId ? "Etapa" : "Fluxograma") : kind === "objective" ? "Objetivo" : "Tarefa";
  return (
    <Dialog open={!!state} onOpenChange={(open) => { if (!open && !attachmentsBusy && !save.isPending) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl" onEscapeKeyDown={(event) => { if (attachmentsBusy || save.isPending) event.preventDefault(); }} onInteractOutside={(event) => { if (attachmentsBusy || save.isPending) event.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle className="font-normal">{editing ? `${numbers.get(editing.id) ?? editing.locator} — ${label}` : isProcess && parentId ? "Nova etapa" : `Novo ${label.toLowerCase()}`}</DialogTitle>
          <DialogDescription>{editing ? `Criado em ${new Date(editing.created_at).toLocaleDateString("pt-BR")}` : `Data de criação: ${new Date().toLocaleDateString("pt-BR")}`}</DialogDescription>
        </DialogHeader>
        <fieldset disabled={!canEdit} className="grid gap-4">
          <div className="grid gap-1.5"><Label>Título</Label><ChecklistText label="Título" value={title} onChange={setTitle} maxLength={titleLimit} hint="Use a Descrição para mais informações." autoFocus />{titleTooLong ? <p role="alert" className="text-xs text-destructive">O título excede o limite atual de {titleLimit} caracteres. Reduza o título ou transfira as informações para a Descrição.</p> : null}</div>
          <div className="grid gap-2 rounded-xl border border-border bg-muted/40 p-3">
            <div className="grid min-w-0 items-start gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
              <div className="grid min-w-0 content-start gap-3"><NodePreview width={data.box.width} height={data.box.height} shape={shape} fillKey={fillKey} borderKey={borderKey} title={title} description={description} responsible={firstName(data.users.find((user) => user.id === responsible)?.full_name ?? "—")} number={editing ? numbers.get(editing.id) ?? String(editing.locator) : "…"} titleSize={titleSize} descriptionSize={descriptionSize} titleColor={titleColor} controlColor={controlColor} align={textAlign} verticalAlign={verticalAlign} process={isProcess} hasAttachments={pendingFiles.length > 0 || data.attachmentNodeIds.includes(editing?.id ?? createdId ?? "")} />
            <div className="grid gap-1"><Label className="text-xs text-muted-foreground">Forma</Label>
              <div className="grid grid-cols-4 gap-1.5">{SHAPES.map((s) => (
                <Button variant="outline" key={s.key} type="button" title={s.label} aria-label={s.label} aria-pressed={shape === s.key} onClick={() => chooseShape(s.key)} className={cn("flex h-auto min-w-0 flex-col items-center justify-center gap-0.5 rounded-md border bg-card px-1 py-1.5 transition-colors", shape === s.key ? "border-primary bg-primary/10" : "border-border hover:border-primary/60")}>
                  <ShapeSvg shape={s.key} fill="transparent" stroke="var(--foreground)" className="h-5 w-8" />
                  <span className="w-full truncate text-center text-[10px] leading-tight text-muted-foreground">{s.label}</span>
                </Button>))}</div>
            </div>
              </div>
              {canStyle ? <TextFormatEditor idPrefix="box" value={{ title_font_size: titleSize, description_font_size: descriptionSize, text_align: textAlign, text_vertical_align: verticalAlign }} onChange={(next) => { setTitleSize(next.title_font_size); setDescriptionSize(next.description_font_size); setTextAlign(next.text_align); setVerticalAlign(next.text_vertical_align); }} /> : null}
            </div>
            {canStyle ? <>
            <div className="grid items-start gap-3 sm:grid-cols-2">
              <FormatColorOptions label="Fundo" value={fillKey} options={FILLS} onChange={setFillKey} />
              <FormatColorOptions label="Borda" value={borderKey} options={BORDERS} onChange={setBorderKey} border />
            </div>
            <ColorOptions label="Cor do título" value={titleColor} onChange={setTitleColor} />
            <ColorOptions label="Cor dos botões e setas" value={controlColor} onChange={setControlColor} defaultLabel="Padrão" />
            {kind === "task" ? <div className="grid gap-1"><Label className="text-xs text-muted-foreground">Conector de entrada (vindo do box predecessor)</Label>
              <div className="flex flex-wrap gap-1.5">{LINK_STYLES.map((l) => <button key={l.key} type="button" title={l.label} aria-label={l.label} aria-pressed={linkStyle === l.key} onClick={() => setLinkStyle(l.key)} className={cn("flex h-8 items-center gap-2 rounded-md border bg-card px-2 text-xs", linkStyle === l.key ? "border-primary bg-primary/10" : "border-border hover:border-primary/60")}><ConnectorGlyph style={l.key} color="var(--foreground)" />{l.label}</button>)}</div>
            </div> : null}
            </> : null}
          </div>
          {isProcess ? <div className="grid gap-2 rounded-xl border border-border p-3">
            <Label>Este fluxo é vinculado a outro fluxograma?</Label>
            <div className="flex gap-2">{([[false, "Não"], [true, "Sim"]] as const).map(([v, l]) => <Button key={l} type="button" variant="outline" size="sm" className={cn("w-20", isLinked === v && "!bg-primary !text-primary-foreground")} aria-pressed={isLinked === v} onClick={() => setIsLinked(v)}>{l}</Button>)}</div>
            {isLinked ? <div className="grid gap-1.5"><span className="text-xs text-muted-foreground">Box (localizador) a partir do qual dispara-se o gatilho deste fluxo</span><SearchableSelect value={linked} onChange={setLinked} options={linkOptions} placeholder="Digite o número ou nome do box" disabled={!canEdit} /></div> : null}
          </div> : null}
          <div className="grid gap-1.5"><Label>Descrição</Label><ChecklistText label="Descrição" value={description} onChange={setDescription} maxLength={descriptionLimit} multiline hint="Redija a descrição." />{descriptionTooLong ? <p role="alert" className="text-xs text-destructive">A descrição excede o limite atual de {descriptionLimit} caracteres. Reduza o texto ou ajuste o tamanho do box e da fonte.</p> : null}</div>
          {requiresNodeResponsible(isProcess) ? <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5"><Label>Responsável</Label><SearchableSelect value={responsible} onChange={setResponsible} options={userOptions} placeholder="Selecione o usuário" disabled={!canEdit} /></div>
            <div className="grid gap-1.5"><Label>Data estimada de conclusão</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
          </div> : null}
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
        {editing && !isProcess ? <NodeConversation nodeId={editing.id} data={data} /> : null}
        <NodeAttachments nodeId={editing?.id ?? createdId ?? undefined} canEdit={canEdit} pending={pendingFiles} onPendingChange={setPendingFiles} onBusyChange={setAttachmentsBusy} />
        <DialogFooter className="gap-2">
          {editing && canEdit ? <Button variant="outline" onClick={() => { if (window.confirm(`Excluir ${numbers.get(editing.id) ?? editing.locator} e todas as tarefas abaixo dele?`)) remove.mutate(); }} disabled={remove.isPending}>Excluir</Button> : null}
          <Button variant="outline" onClick={onClose} disabled={attachmentsBusy || save.isPending}>Cancelar</Button>
          {canEdit ? <Button variant="outline" onClick={() => save.mutate()} disabled={save.isPending || attachmentsBusy || titleTooLong || descriptionTooLong}>Salvar</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
