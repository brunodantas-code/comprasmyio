import { ExportDialog } from "./export-dialog";
import { NodePreview } from "./node-preview";
import { FormatEditor } from "./format-editor";
import type { BoxFormat } from "@/lib/mytosis-format";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Download, FileDown, Pencil, Plus, Paperclip, Route as RouteIcon, Search, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import { childrenMap, computeBoxNumbers, computePhases, computeProgress, criticalPath, formatDate, planBlockImport, rootObjectiveOf, type MytosisNode } from "@/lib/mytosis";
import { firstName, type MytosisData } from "./use-mytosis";
import type { NodeDialogState } from "./node-dialog";
import { ConnectorGlyph, borderOf, fillOf, type LinkStyle, type ShapeKey } from "./shapes";
import { BoxTaskDialog, BoxTaskList, type TaskSelection } from "./box-tasks";
import { predecessorTaskSignal } from "@/lib/mytosis-tasks";
import { ConnectionLayer } from "./connection-layer";
import { Checkbox } from "@/components/ui/checkbox";
import { ConnectorDialog } from "./connector-dialog";
import type { MytosisLink } from "@/lib/mytosis";
import { ChecklistText } from "./checklist-text";
import { MytosisIcon } from "@/components/mytosis-icon";
import { SplitDialog } from "./split-dialog";
import { NodeText } from "./node-text";
import { NodeFrame } from "./node-frame";
import { NodeAttachmentDialog } from "./node-attachments";
import { createMytosisPdf, downloadMytosisPdf } from "@/lib/mytosis-pdf";
import { processEntryNodes } from "@/lib/mytosis-editor";

type Props = {
  data: MytosisData;
  canEdit: boolean;
  objectiveId: string;
  onObjectiveChange: (id: string) => void;
  focusLocator: number | null;
  onFocusHandled: () => void;
  openDialog: (state: NodeDialogState) => void;
  process: boolean;
};

export function Flowchart({ data, canEdit, objectiveId, onObjectiveChange, focusLocator, onFocusHandled, openDialog, process }: Props) {
  const objectives = data.nodes.filter((n) => !n.parent_id && !!n.is_process === process).sort((a, b) => (a.position || 1e9) - (b.position || 1e9) || a.locator - b.locator);
  const [ordering, setOrdering] = useState(false);
  const [importTarget, setImportTarget] = useState<MytosisNode | null>(null);
  const [taskSelection, setTaskSelection] = useState<TaskSelection>(null);
  const [selectedLink, setSelectedLink] = useState<MytosisLink | null>(null);
  const [attachmentTarget, setAttachmentTarget] = useState<MytosisNode | null>(null);
  const [splitTarget, setSplitTarget] = useState<MytosisNode | null>(null);
  const word = process ? "etapa" : "tarefa";
  const objective = objectives.find((o) => o.id === objectiveId) ?? null;
  const [hideRight, setHideRight] = useState<Set<string>>(new Set());
  const [hideDown, setHideDown] = useState<Set<string>>(new Set());
  const [hideTasks, setHideTasks] = useState<Set<string>>(new Set());
  const [highlight, setHighlight] = useState<string | null>(null);
  const [locatorQuery, setLocatorQuery] = useState("");
  const [showCritical, setShowCritical] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [preparedPdf, setPreparedPdf] = useState<{ blob: Blob; title: string } | null>(null);
  async function exportPdf() {
    const canvas = canvasRef.current;
    if (!canvas || !objective || pdfBusy) return;
    setPdfBusy(true);
    try { setPreparedPdf({ blob: await createMytosisPdf(canvas), title: objective.title }); }
    catch { toast.error("Não foi possível gerar o PDF. Tente novamente."); }
    finally { setPdfBusy(false); }
  }
  const allExpanded = hideRight.size === 0 && hideDown.size === 0 && hideTasks.size === 0;

  const children = useMemo(() => childrenMap(data.nodes), [data.nodes]);
  const progress = useMemo(() => computeProgress(data.nodes), [data.nodes]);
  const { phase, last } = useMemo(() => objective ? computePhases(objective.id, data.nodes, data.links) : { phase: new Map<string, number>(), last: 0 }, [objective, data.nodes, data.links]);
  const [k, setK] = useState(last);
  useEffect(() => setK(last), [last, objectiveId]);
  const critical = useMemo(() => showCritical && objective ? criticalPath(objective.id, data.nodes, data.links) : new Set<string>(), [showCritical, objective, data.nodes, data.links]);
  const byId = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);
  const numbers = useMemo(() => computeBoxNumbers(data.nodes, data.links), [data.nodes, data.links]);
  const numberOf = (node: MytosisNode) => numbers.get(node.id) ?? String(node.locator);
  const nameOf = (id: string | null) => firstName(data.users.find((u) => u.id === id)?.full_name ?? "—");

  // Predecessores entre irmãos: o sucessor é desenhado à direita do primeiro predecessor.
  const siblingPreds = useMemo(() => {
    const map = new Map<string, MytosisNode[]>();
    for (const l of data.links) {
      const a = byId.get(l.predecessor_id); const b = byId.get(l.successor_id);
      if (!a || !b || !(a.parent_id === b.parent_id || (!a.parent_id && b.parent_id === a.id))) continue;
      map.set(b.id, [...(map.get(b.id) ?? []), a].sort((x, y) => x.locator - y.locator));
    }
    return map;
  }, [data.links, byId]);
  const drawnSuccessors = (id: string) => data.links
    .filter((l) => l.predecessor_id === id && siblingPreds.get(l.successor_id)?.[0]?.id === id)
    .flatMap((l) => { const node = byId.get(l.successor_id); return node ? [node] : []; }).sort((a, b) => a.locator - b.locator);

  function locate(locator: number | string) {
    const node = data.nodes.find((n) => typeof locator === "number" ? n.locator === locator : numberOf(n) === locator.trim());
    if (!node) return toast.error(`Localizador ${locator} não encontrado.`);
    const root = rootObjectiveOf(node.id, data.nodes);
    if (root && root.id !== objectiveId) onObjectiveChange(root.id);
    setHideRight(new Set()); setHideDown(new Set()); setK(Number.MAX_SAFE_INTEGER);
    setHighlight(node.id);
    window.setTimeout(() => document.getElementById(`mytosis-box-${node.locator}`)?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" }), 600);
  }
  useEffect(() => { if (focusLocator !== null) { locate(focusLocator); onFocusHandled(); } }, [focusLocator]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!locatorQuery.trim()) setHighlight(null); }, [locatorQuery]);

  // Arrastado passa a ser sucessor do destino, com movimentação atômica.
  const queryClient = useQueryClient();
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const deleteNode = useMutation({
    mutationFn: async (node: MytosisNode) => {
      if (!canEdit) throw new Error("Você não tem permissão para excluir esta etapa.");
      const { error } = await supabase.from("mytosis_nodes").delete().eq("id", node.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Etapa excluída."); queryClient.invalidateQueries({ queryKey: ["mytosis"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  const linkMutation = useMutation({
    mutationFn: async ({ from, to }: { from: string; to: string }) => {
      const { error } = await supabase.rpc("reposition_mytosis_node", { _node_id: from, _target_id: to });
      if (error) throw error;
    },
    onSuccess: (_d, v) => { setHideRight((current) => { const next = new Set(current); next.delete(v.to); return next; }); setK(Number.MAX_SAFE_INTEGER); toast.success("Etapa reposicionada e numeração atualizada."); queryClient.invalidateQueries({ queryKey: ["mytosis"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  function connect(from: string, to: string) {
    if (from === to) return;
    if (!canEdit || linkMutation.isPending) return;
    linkMutation.mutate({ from, to });
  }

  const toggle = (set: Set<string>, id: string) => { const next = new Set(set); if (next.has(id)) next.delete(id); else next.add(id); return next; };
  const visibleFrom = last - Math.min(k, last);

  function renderBranch(node: MytosisNode) {
    const kids = (children.get(node.id) ?? []).filter((c) => !siblingPreds.has(c.id));
    const succ = drawnSuccessors(node.id);
    const extraPreds = (siblingPreds.get(node.id) ?? []).slice(1);
    const collapsed = (phase.get(node.id) ?? 0) < visibleFrom;
    const pct = progress.get(node.id) ?? 0;
    const downOpen = !hideDown.has(node.id);
    const rightOpen = !hideRight.has(node.id);
    const shape = (node.shape ?? "process") as ShapeKey;
    const showControls = shape === "process" || !node.parent_id;
    const fill = fillOf(node.fill_color);
    const stroke = critical.has(node.id) || highlight === node.id ? "var(--myio-green)" : borderOf(node.border_color).color;
    const fillColor = highlight === node.id ? "var(--mytosis-green-soft)" : critical.has(node.id) ? "var(--mytosis-green-mid)" : fill.color;
    const displayFillKey = highlight === node.id ? "green-soft" : critical.has(node.id) ? "green-mid" : fill.key;
    const signal = predecessorTaskSignal(node.id, data.tasks, data.links);
    const hasTasks = data.tasks.some((task) => task.node_id === node.id);
    const hasAttachments = data.attachmentNodeIds.includes(node.id);
    const tasksOpen = !hideTasks.has(node.id);
    return (
      <div className="flex items-start">
        <div className="flex flex-col">
          <div className="flex items-start gap-1.5">
            <div className="relative transition-[width,opacity] duration-500 ease-in-out" style={{ width: collapsed ? 30 : data.box.width, minHeight: data.box.height, opacity: collapsed ? 0.55 : 1 }}>
              <div
                id={`mytosis-box-${node.locator}`}
                data-mytosis-node={node.id}
                data-mytosis-shape={shape}
                data-control-color={node.control_color ?? "green"}
                data-mytosis-collapsed={collapsed ? "true" : "false"}
                style={{ minHeight: data.box.height }}
                role="button"
                tabIndex={0}
                draggable={canEdit && !collapsed && !!node.parent_id && !linkMutation.isPending}
                onDragStart={(e) => { e.dataTransfer.setData("text/plain", node.id); e.dataTransfer.effectAllowed = "link"; setDragId(node.id); }}
                onDragEnd={() => { setDragId(null); setDropId(null); }}
                onDragOver={(e) => { if (dragId && dragId !== node.id) { e.preventDefault(); e.dataTransfer.dropEffect = "link"; if (dropId !== node.id) setDropId(node.id); } }}
                onDragLeave={() => setDropId((d) => (d === node.id ? null : d))}
                onDrop={(e) => { e.preventDefault(); const from = e.dataTransfer.getData("text/plain") || dragId; setDropId(null); setDragId(null); if (from) connect(from, node.id); }}
                onClick={(e) => { if (e.target instanceof Element && e.target.closest("button,[role='menuitem']")) return; openDialog({ mode: "edit", node }); }}
                onKeyDown={(e) => { if (e.target === e.currentTarget && e.key === "Enter") openDialog({ mode: "edit", node }); }}
                title={canEdit ? `${numberOf(node)} — ${node.title}\nArraste sobre outro box para posicionar esta etapa à direita dele.` : `${numberOf(node)} — ${node.title}`}
                className={cn("mytosis-controls group relative flex h-full w-full cursor-pointer rounded-md transition-colors duration-300 [&_button]:!border-0 [&_button]:!shadow-none [&_button]:!bg-transparent [&_button:hover]:!bg-transparent [&_button:focus-visible]:!ring-0", dropId === node.id && "ring-2 ring-primary ring-offset-2", dragId === node.id && "opacity-50")}
              >
                <NodeFrame shape={shape} height={data.box.height} fill={fillColor} stroke={stroke} fillKey={displayFillKey} strokeWidth={highlight === node.id ? 2 : 1} progress={process ? undefined : pct} collapsed={collapsed} controlColor={node.control_color}
                  header={<div className="flex shrink-0 items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="flex min-w-0 items-center gap-1.5"><span className="inline-flex min-h-5 shrink-0 items-center justify-center rounded-md bg-primary/10 px-1.5 text-primary">{numberOf(node)}</span>{node.kind === "objective" && !process ? <span className="truncate">Objetivo</span> : null}</span>
                      <div className="flex shrink-0 items-center gap-1">{process ? null : <span className="text-muted-foreground/70">{pct}%</span>}{showControls && hasAttachments ? <Button variant="ghost" size="icon" className="h-5 w-5" aria-label={`Anexos da etapa ${numberOf(node)}`} title="Anexos" onClick={(event) => { event.stopPropagation(); setAttachmentTarget(node); }} onPointerDown={(event) => event.stopPropagation()}><Paperclip className="h-3.5 w-3.5" /></Button> : null}{showControls && canEdit ? <><Button variant="ghost" size="icon" className="h-5 w-5 !bg-transparent hover:!bg-transparent [&_svg]:!size-5" aria-label={`Dividir próxima etapa de ${numberOf(node)}`} title="Dividir próxima etapa" onClick={(event) => { event.stopPropagation(); setSplitTarget(node); }} onPointerDown={(event) => event.stopPropagation()}><MytosisIcon className="h-5 w-5" /></Button><Button variant="ghost" size="icon" className="h-5 w-5 !bg-transparent hover:!bg-transparent [&_svg]:!size-3" aria-label={`Excluir etapa ${numberOf(node)}`} title="Excluir etapa" disabled={deleteNode.isPending} onClick={(event) => { event.stopPropagation(); if (window.confirm(`Excluir a etapa ${numberOf(node)} — ${node.title} e todas as tarefas e subetapas abaixo dela? Esta ação não pode ser desfeita.`)) deleteNode.mutate(node); }} onPointerDown={(event) => event.stopPropagation()}><Trash2 className="h-3 w-3" /></Button></> : null}{!process && signal.pending > 0 ? <div role="status" aria-label={`${signal.pending} tarefa${signal.pending > 1 ? "s" : ""} pendente${signal.pending > 1 ? "s" : ""} na etapa anterior`} title={`${signal.pending} pendência${signal.pending > 1 ? "s" : ""} na etapa anterior`} className="ml-1 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">{signal.pending > 99 ? "99+" : signal.pending}</div> : null}</div>
                    </div>}
                  footer={<div className="flex shrink-0 items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      {process ? (node.linked_node_id ? <span className="truncate" title="Gatilho em outro fluxograma">Gatilho: {numbers.get(node.linked_node_id) ?? "—"}</span> : <span />) : <span className="truncate">{nameOf(node.responsible_id)} · {formatDate(node.due_date)}</span>}
                      {showControls ? <div className="flex shrink-0 items-center gap-0.5">
                      {succ.length ? <Button variant="ghost" size="icon" className="h-5 w-5 !bg-transparent hover:!bg-transparent" aria-label={`${rightOpen ? "Recolher" : "Exibir"} boxes dependentes de ${numberOf(node)}`} title={rightOpen ? "Recolher boxes dependentes" : "Exibir boxes dependentes"} aria-expanded={rightOpen} onClick={(e) => { e.stopPropagation(); setHideRight((s) => toggle(s, node.id)); }} onPointerDown={(e) => e.stopPropagation()}>{rightOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</Button> : null}
                      {kids.length ? <Button variant="ghost" size="icon" className="h-5 w-5 !bg-transparent hover:!bg-transparent" aria-label={`${downOpen ? "Recolher" : "Exibir"} boxes abaixo de ${numberOf(node)}`} title={downOpen ? "Recolher boxes abaixo" : "Exibir boxes abaixo"} aria-expanded={downOpen} onClick={(e) => { e.stopPropagation(); setHideDown((s) => toggle(s, node.id)); }} onPointerDown={(e) => e.stopPropagation()}>{downOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button> : null}
                      {hasTasks ? <Button variant="ghost" size="icon" className="h-5 w-5 !bg-transparent text-[11px] font-semibold hover:!bg-transparent" aria-label={`${tasksOpen ? "Recolher" : "Exibir"} tarefas do box ${numberOf(node)}`} title={tasksOpen ? "Recolher tarefas" : "Exibir tarefas"} aria-expanded={tasksOpen} aria-controls={`mytosis-tasks-${node.id}`} onClick={(e) => { e.stopPropagation(); setHideTasks((s) => toggle(s, node.id)); }} onPointerDown={(e) => e.stopPropagation()}>T</Button> : null}
                      {canEdit ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} className="h-4 w-4" aria-label={`Adicionar ${word}`} title={`Adicionar ${word}`}><Plus className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => setTaskSelection({ nodeId: node.id })}>Nova tarefa neste box</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDialog({ mode: "create", kind: "task", parentId: node.id, formatSourceId: node.id })}>{process ? "Subetapa (abaixo)" : "Tarefa associada (abaixo)"}</DropdownMenuItem>
                            {node.parent_id ? <DropdownMenuItem onClick={() => openDialog({ mode: "create", kind: "task", parentId: node.parent_id, wrapId: node.id, formatSourceId: node.id })}>{process ? "Etapa superior (acima)" : "Tarefa associada (acima)"}</DropdownMenuItem> : null}
                            {node.parent_id ? <DropdownMenuItem onClick={() => openDialog({ mode: "create", kind: "task", parentId: node.parent_id, predecessorId: node.id, formatSourceId: node.id })}>{process ? "Próxima etapa (à direita)" : "Tarefa dependente (à direita)"}</DropdownMenuItem> : (() => {
                              const ends = kids.filter((k) => !data.links.some((l) => l.predecessor_id === k.id && kids.some((o) => o.id === l.successor_id))).sort((a, b) => numberOf(a).localeCompare(numberOf(b), undefined, { numeric: true }));
                              const last = ends[ends.length - 1];
                              return <DropdownMenuItem onClick={() => openDialog({ mode: "create", kind: "task", parentId: node.id, predecessorId: last?.id, formatSourceId: last?.id ?? node.id })}>{process ? "Próxima etapa (à direita)" : "Tarefa dependente (à direita)"}</DropdownMenuItem>;
                            })()}
                            <DropdownMenuItem onClick={() => setImportTarget(node)}>Importar fluxograma como bloco (abaixo)</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                      </div> : null}
                    </div>}>
                  {collapsed ? <span className="relative m-auto text-[10px] text-muted-foreground [writing-mode:vertical-rl]">{numberOf(node)}</span> : (<NodeText title={node.title} description={node.description} titleSize={node.title_font_size} descriptionSize={node.description_font_size} align={node.text_align} verticalAlign={node.text_vertical_align} titleColor={node.title_color} fillKey={highlight === node.id ? "green-soft" : critical.has(node.id) ? "green-mid" : node.fill_color} />)}
                </NodeFrame>
              </div>
              {extraPreds.length && !collapsed ? <span className="absolute -top-4 left-0 text-[10px] text-muted-foreground">também depende de {extraPreds.map((p) => numberOf(p)).join(", ")}</span> : null}
            </div>
          </div>
          {!collapsed ? <div style={{ width: data.box.width }} className={tasksOpen && data.tasks.some((t) => t.node_id === node.id) ? "pb-6" : undefined}>
            <BoxTaskList nodeId={node.id} data={data} onOpen={setTaskSelection} expanded={tasksOpen} />
          </div> : null}
          {kids.length ? (
            <>
              <div data-mytosis-hidden={!downOpen ? "true" : "false"} className="grid transition-[grid-template-rows,opacity] duration-500 ease-in-out" style={{ gridTemplateRows: downOpen ? "1fr" : "0fr", opacity: downOpen ? 1 : 0 }}>
                <div className="overflow-hidden">
                  <div className="flex flex-col gap-4 py-2">
                    {kids.map((kid) => <Fragment key={kid.id}>{renderBranch(kid)}</Fragment>)}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
        {succ.length ? (
          <div data-mytosis-hidden={!rightOpen ? "true" : "false"} className="grid transition-[grid-template-columns,opacity] duration-500 ease-in-out" style={{ gridTemplateColumns: rightOpen ? "1fr" : "0fr", opacity: rightOpen ? 1 : 0 }}>
            <div className="min-w-0 overflow-hidden">
              <div className="flex flex-col gap-4">
                {succ.map((s) => (
                  <div key={s.id} className="flex items-start">
                    <span className="w-8 shrink-0" style={{ height: data.box.height }} />
                    {renderBranch(s)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {ordering ? <RootOrderDialog roots={objectives} process={!!process} onClose={() => setOrdering(false)} /> : null}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3">
        <div className="grid min-w-0 flex-1 basis-64 gap-1"><Label className="text-xs text-muted-foreground">{process ? "Fluxograma" : "Objetivo"}</Label>
          <SearchableSelect aria-label={process ? "Fluxograma" : "Objetivo"} className="h-10 rounded-none border-0 border-b border-primary text-lg font-semibold shadow-none focus-within:ring-0 [&_input]:px-0 [&>span]:left-0" renderSelected={(option) => <span className="flex items-center gap-3"><span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">{option.hint}</span><span className="truncate text-base font-normal">{option.label.slice((option.hint ?? "").length + 1)}</span></span>} value={objectiveId} onChange={onObjectiveChange} clearable={false} placeholder={process ? "Selecione o fluxograma" : "Selecione o objetivo"} options={objectives.map((o) => ({ value: o.id, label: `${numbers.get(o.id) ?? o.locator} ${o.title}`, hint: String(numbers.get(o.id) ?? o.locator), keywords: o.title }))} optionClassName="border-b border-border last:border-b-0 rounded-none py-2" renderOption={(option) => <span className="flex items-center gap-3"><span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">{option.hint}</span><span className="truncate text-base font-normal">{option.label.slice((option.hint ?? "").length + 1)}</span></span>} />
          <div className="flex justify-between gap-2 text-[11px] text-muted-foreground"><span>{process ? "Selecione o fluxograma." : "Selecione o objetivo."}</span>{canEdit && objectives.length > 1 ? <button type="button" className="text-primary hover:underline" onClick={() => setOrdering(true)}>Ordenar</button> : null}<span className="tabular-nums">{objective ? `${numbers.get(objective.id) ?? objective.locator} ${objective.title}`.length : 0} caracteres</span></div>
        </div>
        <form className="grid gap-1" onSubmit={(e) => { e.preventDefault(); const v = locatorQuery.trim(); if (v) locate(v); else setHighlight(null); }}>
          <Label className="text-xs text-muted-foreground">Localizador</Label>
          <div className="flex items-end gap-2"><div className="w-36 [&_input]:border-primary"><ChecklistText value={locatorQuery} onChange={setLocatorQuery} label="Localizador" hint="Nº do box" /></div><Button type="submit" variant="outline" size="icon" className="h-7 w-7 rounded-lg" aria-label="Localizar box" title="Localizar box"><Search className="h-3.5 w-3.5" /></Button></div>
        </form>
        <div className="grid min-w-48 gap-1">
          <Label className="text-xs text-muted-foreground">Fases exibidas: {last === 0 ? "única" : `${visibleFrom + 1} a ${last + 1} de ${last + 1}`}</Label>
          <Slider min={0} max={Math.max(last, 1)} step={1} value={[Math.min(k, last)]} onValueChange={([v]) => setK(v)} disabled={last === 0} className="h-9" />
        </div>
        <label className="flex h-9 cursor-pointer items-center gap-2 text-xs text-muted-foreground"><Checkbox checked={allExpanded} aria-label="Exibir tudo" onCheckedChange={(checked) => {
          setHideRight(checked ? new Set() : new Set(data.nodes.map((node) => node.id)));
          setHideDown(checked ? new Set() : new Set(data.nodes.map((node) => node.id)));
          setHideTasks(checked ? new Set() : new Set(data.nodes.map((node) => node.id)));
          if (checked) setK(last);
        }} />Exibir tudo</label>
        {process ? null : <Button variant="outline" onClick={() => setShowCritical((v) => !v)} className={cn(showCritical && "!bg-primary !text-primary-foreground")}><RouteIcon className="h-4 w-4" />Caminho crítico</Button>}
        <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" aria-label="Exportar fluxograma para PDF" title={pdfBusy ? "Gerando PDF…" : "Exportar fluxograma para PDF"} disabled={!objective} onClick={() => setExportOpen(true)}><FileDown className={cn("h-3.5 w-3.5", pdfBusy && "animate-pulse motion-reduce:animate-none")} /></Button>
        {data.role === "admin" ? <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setSettingsOpen(true)} aria-label="Box padrão" title="Box padrão"><Settings2 className="h-3.5 w-3.5" /></Button> : null}
        {canEdit ? <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => openDialog({ mode: "create", kind: "objective", parentId: null, process })} aria-label={process ? "Novo fluxograma" : "Novo objetivo"} title={process ? "Novo fluxograma" : "Novo objetivo"}><Plus className="h-5 w-5" /></Button> : null}
        {process && objective && canEdit ? <><Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" aria-label="Editar fluxograma" title="Editar fluxograma" onClick={() => openDialog({ mode: "edit", node: objective })}><Pencil className="size-3.5" /></Button><Button variant="outline" size="sm" onClick={() => openDialog({ mode: "create", kind: "task", parentId: objective.id, process: true })}><Plus className="size-3.5" />Nova etapa</Button></> : null}
      </div>
      {objective ? (
        <div className="overflow-auto rounded-xl border border-border bg-card p-6" onClick={() => setHighlight(null)}>
          <div ref={canvasRef} className="relative w-max min-w-full pt-3" onClick={(e) => e.stopPropagation()}>{process ? <div className="flex flex-col gap-4">{processEntryNodes(objective.id, data.nodes, data.links).map((node) => <Fragment key={node.id}>{renderBranch(node)}</Fragment>)}</div> : renderBranch(objective)}<ConnectionLayer container={canvasRef} nodes={data.nodes} links={data.links} onSelect={canEdit ? setSelectedLink : undefined} layoutKey={`${objectiveId}:${[...hideRight].join(',')}:${[...hideDown].join(',')}:${[...hideTasks].join(',')}:${k}`} /></div>
        </div>
      ) : <p className="py-16 text-center text-muted-foreground">{process ? (objectives.length ? "Selecione um fluxograma." : "Nenhum fluxograma cadastrado.") : objectives.length ? "Selecione um objetivo." : "Nenhum objetivo cadastrado. Use o + para criar o primeiro."}</p>}
      <ImportBlockDialog target={importTarget} onClose={() => setImportTarget(null)} data={data} />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} roots={objectives} currentId={objectiveId} onSelect={onObjectiveChange} getCanvas={() => canvasRef.current} canEdit={canEdit} process={process} />
      <Dialog open={!!preparedPdf} onOpenChange={(open) => { if (!open) setPreparedPdf(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-normal">Exportar PDF</DialogTitle><DialogDescription>{preparedPdf?.title}</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setPreparedPdf(null)}>Cancelar</Button><Button variant="outline" onClick={() => { if (preparedPdf) void downloadMytosisPdf(preparedPdf.blob, preparedPdf.title).catch(() => toast.error("Não foi possível baixar o PDF.")); }}><Download className="h-4 w-4" />Baixar PDF</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <NodeAttachmentDialog node={attachmentTarget} canEdit={canEdit} onClose={() => setAttachmentTarget(null)} />
      <SplitDialog node={splitTarget} onClose={() => setSplitTarget(null)} onCreated={(id) => { setHideRight((current) => { const next = new Set(current); next.delete(id); return next; }); setHideDown((current) => { const next = new Set(current); next.delete(id); return next; }); setK(Number.MAX_SAFE_INTEGER); }} />
      <BoxTaskDialog selection={taskSelection} onSelect={setTaskSelection} onClose={() => setTaskSelection(null)} data={data} canEdit={canEdit} />
      <BoxSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} box={data.box} defaultFormat={data.defaultFormat} />
      <ConnectorDialog link={selectedLink} onClose={() => setSelectedLink(null)} label={selectedLink ? `${data.nodes.find((n) => n.id === selectedLink.predecessor_id)?.title} → ${data.nodes.find((n) => n.id === selectedLink.successor_id)?.title}` : ""} />
    </div>
  );
}

function BoxSettingsDialog({ open, onClose, box, defaultFormat }: { open: boolean; onClose: () => void; box: { width: number; height: number }; defaultFormat: BoxFormat }) {
  const queryClient = useQueryClient();
  const [width, setWidth] = useState(String(box.width));
  const [height, setHeight] = useState(String(box.height));
  const [format, setFormat] = useState<BoxFormat>(defaultFormat);
  const [confirmApply, setConfirmApply] = useState(false);
  useEffect(() => { if (open) { setWidth(String(box.width)); setHeight(String(box.height)); setFormat(defaultFormat); } }, [open, box, defaultFormat]);
  const validate = () => {
    const w = Number(width), h = Number(height);
    if (!(w >= 160 && w <= 480) || !(h >= 64 && h <= 240)) throw new Error("Largura entre 160 e 480 px; altura entre 64 e 240 px.");
    if (![format.title_font_size, format.description_font_size].every((n) => Number.isInteger(n) && n >= 10 && n <= 32)) throw new Error("Informe tamanhos de fonte entre 10 e 32 px.");
    return { w, h };
  };
  const persist = async () => {
    const { w, h } = validate();
    const { error } = await supabase.from("mytosis_settings").update({ box_width: w, box_height: h, box_format: format }).eq("id", 1);
    if (error) throw error;
  };
  const save = useMutation({
    mutationFn: persist,
    onSuccess: () => { toast.success("Box padrão salvo."); queryClient.invalidateQueries({ queryKey: ["mytosis"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const apply = useMutation({
    mutationFn: async () => {
      await persist();
      const { error } = await supabase.from("mytosis_nodes").update({ ...format }).eq("is_process", true).eq("custom_format", false);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Padrão aplicado aos boxes padrão de todos os fluxogramas."); setConfirmApply(false); queryClient.invalidateQueries({ queryKey: ["mytosis"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const busy = save.isPending || apply.isPending;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle className="font-normal">Box padrão</DialogTitle><DialogDescription>Novas etapas começam com este formato. Todos os boxes usam a mesma largura e altura.</DialogDescription></DialogHeader>
        <div className="grid gap-3 rounded-xl border border-border bg-muted/40 p-3">
          <FormatEditor value={format} onChange={setFormat} preview={<NodePreview width={Number(width) || box.width} height={Number(height) || box.height} shape={format.shape as ShapeKey} fillKey={format.fill_color} borderKey={format.border_color} title="Título da etapa" description="Descrição" responsible="—" number="1.1" titleSize={format.title_font_size} descriptionSize={format.description_font_size} titleColor={format.title_color} controlColor={format.control_color} align={format.text_align} verticalAlign={format.text_vertical_align} process />} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5"><Label>Largura (px)</Label><Input type="number" value={width} onChange={(e) => setWidth(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Altura (px)</Label><Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} /></div>
        </div>
        {confirmApply ? <div role="alert" className="grid gap-2 rounded-md border border-border p-3 text-sm">
          <p>Todos os boxes padrão dos fluxogramas receberão este formato. Boxes customizados serão mantidos. Confirmar?</p>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setConfirmApply(false)} disabled={busy}>Cancelar</Button><Button variant="outline" onClick={() => apply.mutate()} disabled={busy}>Confirmar</Button></div>
        </div> : null}
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => setConfirmApply(true)} disabled={busy}>Aplicar a todos os fluxogramas</Button>
          <div className="flex gap-2"><Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button><Button variant="outline" onClick={() => save.mutate()} disabled={busy}>Salvar</Button></div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportBlockDialog({ target, onClose, data }: { target: MytosisNode | null; onClose: () => void; data: MytosisData }) {
  const queryClient = useQueryClient();
  const [sourceId, setSourceId] = useState("");
  useEffect(() => { if (target) setSourceId(""); }, [target]);
  const numbers = useMemo(() => computeBoxNumbers(data.nodes, data.links), [data.nodes, data.links]);
  const targetRoot = target ? rootObjectiveOf(target.id, data.nodes) : null;
  const sources = data.nodes.filter((n) => !n.parent_id && n.is_process && n.id !== targetRoot?.id);
  const run = useMutation({
    mutationFn: async () => {
      if (!target || !sourceId) throw new Error("Selecione o fluxograma a importar.");
      const { ordered, internalLinks } = planBlockImport(sourceId, data.nodes, data.links);
      const idMap = new Map<string, string>();
      const position = data.nodes.filter((n) => n.parent_id === target.id).length;
      for (const n of ordered) {
        const parent = n.id === sourceId ? target.id : n.parent_id ? idMap.get(n.parent_id) : undefined;
        if (!parent) throw new Error("Box pai não encontrado na importação.");
        const { data: created, error } = await supabase.from("mytosis_nodes").insert({
          kind: "task", title: n.title, description: n.description, parent_id: parent, responsible_id: n.responsible_id,
          due_date: null, weight: 0, progress: 0, shape: n.shape, fill_color: n.fill_color, border_color: n.border_color, position: n.id === sourceId ? position : n.position, is_process: !!target.is_process,
          title_font_size: n.title_font_size, title_color: n.title_color, control_color: n.control_color, description_font_size: n.description_font_size, text_align: n.text_align, text_vertical_align: n.text_vertical_align,
        }).select("id").single();
        if (error) throw error;
        idMap.set(n.id, created.id);
      }
      if (internalLinks.length) {
        const copiedLinks = internalLinks.map((l) => {
          const predecessor = idMap.get(l.predecessor_id), successor = idMap.get(l.successor_id);
          if (!predecessor || !successor) throw new Error("Ligação não encontrada na importação.");
          return { predecessor_id: predecessor, successor_id: successor, style: l.style, color: l.color };
        });
        const { error } = await supabase.from("mytosis_links").insert(copiedLinks);
        if (error) throw error;
      }
      return ordered.length;
    },
    onSuccess: (count) => { toast.success(`Bloco importado (${count} boxes).`); queryClient.invalidateQueries({ queryKey: ["mytosis"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-normal">Importar fluxograma como bloco</DialogTitle><DialogDescription>Uma cópia do fluxograma escolhido entra abaixo de {target ? numbers.get(target.id) ?? target.locator : ""} {target?.title}. O original não muda.</DialogDescription></DialogHeader>
        <SearchableSelect value={sourceId} onChange={setSourceId} placeholder="Selecione o fluxograma" options={sources.map((o) => ({ value: o.id, label: `${numbers.get(o.id) ?? o.locator} ${o.title}` }))} />
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button variant="outline" onClick={() => run.mutate()} disabled={run.isPending || !sourceId}>Confirmar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RootOrderDialog({ roots, process, onClose }: { roots: MytosisNode[]; process: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState(roots);
  const [dragId, setDragId] = useState<string | null>(null);
  const move = (overId: string) => {
    if (!dragId || dragId === overId) return;
    setItems((cur) => { const next = [...cur]; const from = next.findIndex((n) => n.id === dragId); const to = next.findIndex((n) => n.id === overId); const [m] = next.splice(from, 1); next.splice(to, 0, m); return next; });
  };
  const save = useMutation({
    mutationFn: async () => {
      for (const [i, n] of items.entries()) {
        if ((n.position ?? 0) === i + 1) continue;
        const { error } = await supabase.from("mytosis_nodes").update({ position: i + 1 }).eq("id", n.id);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Ordem salva e numeração atualizada."); queryClient.invalidateQueries({ queryKey: ["mytosis"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-normal">Ordenar {process ? "fluxogramas" : "objetivos"}</DialogTitle><DialogDescription>Arraste pelo número para mudar a posição. A numeração se atualiza automaticamente.</DialogDescription></DialogHeader>
        <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
          {items.map((n, i) => (
            <li key={n.id} onDragOver={(e) => { e.preventDefault(); move(n.id); }} onDrop={(e) => { e.preventDefault(); setDragId(null); }} className={cn("flex items-center gap-3 py-2", dragId === n.id && "opacity-50")}>
              <div draggable onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDragId(n.id); }} onDragEnd={() => setDragId(null)} className="flex cursor-grab flex-col items-center gap-0.5 active:cursor-grabbing" title="Arrastar">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">{i + 1}</span>
                <span className="text-[10px] text-muted-foreground">Arrastar</span>
              </div>
              <span className="min-w-0 flex-1 truncate text-sm">{n.title}</span>
            </li>
          ))}
        </ul>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button variant="outline" disabled={save.isPending} onClick={() => save.mutate()}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
