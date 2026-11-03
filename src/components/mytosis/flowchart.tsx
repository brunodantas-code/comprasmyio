import { Fragment, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Filter, Plus, Route as RouteIcon, Search, Settings2 } from "lucide-react";
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
import { ConnectorGlyph, ShapeSvg, borderOf, fillOf, shapeInset, type LinkStyle, type ShapeKey } from "./shapes";
import { BoxTaskDialog, BoxTaskList, type TaskSelection } from "./box-tasks";
import { predecessorTaskSignal } from "@/lib/mytosis-tasks";

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
  const objectives = data.nodes.filter((n) => !n.parent_id && !!n.is_process === process);
  const [importTarget, setImportTarget] = useState<MytosisNode | null>(null);
  const [taskSelection, setTaskSelection] = useState<TaskSelection>(null);
  const word = process ? "etapa" : "tarefa";
  const objective = objectives.find((o) => o.id === objectiveId) ?? null;
  const [hideRight, setHideRight] = useState<Set<string>>(new Set());
  const [hideDown, setHideDown] = useState<Set<string>>(new Set());
  const [highlight, setHighlight] = useState<string | null>(null);
  const [locatorQuery, setLocatorQuery] = useState("");
  const [showCritical, setShowCritical] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
      if (!a || !b || a.parent_id !== b.parent_id) continue;
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

  // Arrastar um box sobre outro cria a ligação: arrastado = predecessor, alvo = sucessor.
  const queryClient = useQueryClient();
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const linkMutation = useMutation({
    mutationFn: async ({ from, to }: { from: string; to: string }) => {
      const { error } = await supabase.from("mytosis_links").insert({ predecessor_id: from, successor_id: to });
      if (error) throw error;
    },
    onSuccess: (_d, v) => { toast.success(`Ligação criada.`); queryClient.invalidateQueries({ queryKey: ["mytosis"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  function reaches(from: string, to: string) {
    const seen = new Set<string>(); const stack = [from];
    while (stack.length) { const c = stack.pop(); if (!c) continue; if (c === to) return true; if (seen.has(c)) continue; seen.add(c); for (const l of data.links) if (l.predecessor_id === c) stack.push(l.successor_id); }
    return false;
  }
  function connect(from: string, to: string) {
    if (from === to) return;
    if (data.links.some((l) => l.predecessor_id === from && l.successor_id === to)) return toast.info("Esses boxes já estão ligados.");
    if (reaches(to, from)) return toast.error("Essa ligação criaria um ciclo entre os boxes.");
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
    const fill = fillOf(node.fill_color);
    const stroke = critical.has(node.id) || highlight === node.id ? "var(--myio-green)" : borderOf(node.border_color).color;
    const fillColor = highlight === node.id ? "var(--mytosis-green-soft)" : critical.has(node.id) ? "var(--mytosis-green-mid)" : fill.color;
    const darkText = fill.dark && highlight !== node.id && !critical.has(node.id);
    const signal = predecessorTaskSignal(node.id, data.tasks, data.links);
    return (
      <div className="flex items-start">
        <div className="flex flex-col">
          <div className="flex items-start gap-1.5">
            <div className="relative transition-[width,opacity] duration-500 ease-in-out" style={{ width: collapsed ? 30 : data.box.width, height: data.box.height, opacity: collapsed ? 0.55 : 1 }}>
              <div
                id={`mytosis-box-${node.locator}`}
                role="button"
                tabIndex={0}
                draggable={canEdit && !collapsed}
                onDragStart={(e) => { e.dataTransfer.setData("text/plain", node.id); e.dataTransfer.effectAllowed = "link"; setDragId(node.id); }}
                onDragEnd={() => { setDragId(null); setDropId(null); }}
                onDragOver={(e) => { if (dragId && dragId !== node.id) { e.preventDefault(); e.dataTransfer.dropEffect = "link"; if (dropId !== node.id) setDropId(node.id); } }}
                onDragLeave={() => setDropId((d) => (d === node.id ? null : d))}
                onDrop={(e) => { e.preventDefault(); const from = e.dataTransfer.getData("text/plain") || dragId; setDropId(null); setDragId(null); if (from) connect(from, node.id); }}
                onClick={(e) => { if (e.target instanceof Element && e.target.closest("button,[role='menuitem']")) return; openDialog({ mode: "edit", node }); }}
                onKeyDown={(e) => { if (e.target === e.currentTarget && e.key === "Enter") openDialog({ mode: "edit", node }); }}
                title={canEdit ? `${numberOf(node)} — ${node.title}\nArraste sobre outro box para ligá-lo como sucessor.` : `${numberOf(node)} — ${node.title}`}
                className={cn("group relative flex h-full w-full cursor-pointer overflow-hidden rounded-md transition-colors duration-300", dropId === node.id && "ring-2 ring-primary ring-offset-2", dragId === node.id && "opacity-50", darkText ? "text-primary-foreground [&_*]:!text-[color:var(--card)]" : "text-foreground")}
              >
                <ShapeSvg shape={shape} fill={fillColor} stroke={stroke} strokeWidth={highlight === node.id ? 2 : 1} className="pointer-events-none absolute inset-0 h-full w-full transition-all duration-300 group-hover:[filter:drop-shadow(0_0_1px_var(--myio-green))]" />
                {process ? null : <div className="relative w-1.5 shrink-0 bg-primary/10" aria-label={`${pct}% concluído`}>
                  <div className="absolute inset-x-0 bottom-0 bg-primary transition-[height] duration-500" style={{ height: `${pct}%` }} />
                </div>}
                {collapsed ? <span className="relative m-auto text-[10px] text-muted-foreground [writing-mode:vertical-rl]">{numberOf(node)}</span> : (
                  <div className="relative flex min-w-0 flex-1 flex-col justify-between px-2.5 py-1.5" style={shapeInset[shape]}>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="flex min-w-0 items-center gap-1.5"><span className="inline-flex min-h-5 shrink-0 items-center justify-center rounded-md bg-primary/10 px-1.5 text-primary">{numberOf(node)}</span>{node.kind === "objective" ? <span className="truncate">{process ? "Fluxograma" : "Objetivo"}</span> : null}</span>
                      {process ? null : <span className="text-muted-foreground/70">{pct}%</span>}
                    </div>
                    <div className="min-w-0"><p className={cn("text-lg font-semibold leading-tight", node.description ? "line-clamp-1" : "line-clamp-2")}>{node.title}</p>{node.description ? <p className="line-clamp-1 text-[11px] font-normal leading-tight text-muted-foreground" title={node.description}>{node.description}</p> : null}</div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate">{nameOf(node.responsible_id)}{process ? "" : ` · ${formatDate(node.due_date)}`}</span>
                      {canEdit ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} className="h-4 w-4 !text-primary" aria-label={`Adicionar ${word}`} title={`Adicionar ${word}`}><Plus className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => setTaskSelection({ nodeId: node.id })}>Nova tarefa neste box</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDialog({ mode: "create", kind: "task", parentId: node.id })}>{process ? "Etapa associada (abaixo)" : "Tarefa associada (abaixo)"}</DropdownMenuItem>
                            {node.parent_id ? <DropdownMenuItem onClick={() => openDialog({ mode: "create", kind: "task", parentId: node.parent_id, predecessorId: node.id })}>{process ? "Etapa dependente (à direita)" : "Tarefa dependente (à direita)"}</DropdownMenuItem> : null}
                            <DropdownMenuItem onClick={() => setImportTarget(node)}>Importar fluxograma como bloco (abaixo)</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
              {extraPreds.length && !collapsed ? <span className="absolute -top-4 left-0 text-[10px] text-muted-foreground">também depende de {extraPreds.map((p) => numberOf(p)).join(", ")}</span> : null}
            </div>
            {succ.length ? (
              <button type="button" className="mt-2 text-primary" onClick={() => setHideRight((s) => toggle(s, node.id))} aria-label={rightOpen ? "Recolher dependentes" : "Exibir dependentes"} title={rightOpen ? "Recolher dependentes" : "Exibir dependentes"}>
                {rightOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : null}
          </div>
          {!collapsed ? <div style={{ width: data.box.width }}>
            {signal.pending > 0 ? <p role="status" className="mt-1 text-xs text-destructive">{signal.pending} tarefa{signal.pending > 1 ? "s" : ""} pendente{signal.pending > 1 ? "s" : ""} na etapa anterior</p> : null}
            <BoxTaskList nodeId={node.id} data={data} onOpen={setTaskSelection} />
          </div> : null}
          {kids.length ? (
            <>
              <button type="button" className="mt-1 self-start text-primary" onClick={() => setHideDown((s) => toggle(s, node.id))} aria-label={downOpen ? "Recolher tarefas associadas" : "Exibir tarefas associadas"} title={downOpen ? "Recolher tarefas associadas" : "Exibir tarefas associadas"}>
                {downOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <div className="grid transition-[grid-template-rows,opacity] duration-500 ease-in-out" style={{ gridTemplateRows: downOpen ? "1fr" : "0fr", opacity: downOpen ? 1 : 0 }}>
                <div className="overflow-hidden">
                  <div className="ml-2 flex flex-col gap-4 border-l border-primary/40 py-2 pl-4">
                    {kids.map((kid) => <Fragment key={kid.id}>{renderBranch(kid)}</Fragment>)}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
        {succ.length ? (
          <div className="grid transition-[grid-template-columns,opacity] duration-500 ease-in-out" style={{ gridTemplateColumns: rightOpen ? "1fr" : "0fr", opacity: rightOpen ? 1 : 0 }}>
            <div className="min-w-0 overflow-hidden">
              <div className="flex flex-col gap-4">
                {succ.map((s) => (
                  <div key={s.id} className="flex items-start">
                    <span className="flex items-center px-0.5" style={{ height: data.box.height }}>
                      <ConnectorGlyph style={(data.links.find((l) => l.predecessor_id === node.id && l.successor_id === s.id)?.style ?? "arrow") as LinkStyle} color="var(--myio-green)" />
                    </span>
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
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3">
        <Filter className="mb-2.5 h-4 w-4 text-muted-foreground/60" />
        <div className="grid min-w-64 flex-1 gap-1"><Label className="text-xs text-muted-foreground">{process ? "Fluxograma" : "Objetivo"}</Label>
          <SearchableSelect value={objectiveId} onChange={onObjectiveChange} clearable={false} placeholder={process ? "Selecione o fluxograma" : "Selecione o objetivo"} options={objectives.map((o) => ({ value: o.id, label: `${numbers.get(o.id) ?? o.locator} ${o.title}` }))} />
        </div>
        <form className="grid gap-1" onSubmit={(e) => { e.preventDefault(); const v = locatorQuery.trim(); if (v) locate(v); else setHighlight(null); }}>
          <Label className="text-xs text-muted-foreground">Localizador</Label>
          <div className="flex gap-1"><Input value={locatorQuery} onChange={(e) => setLocatorQuery(e.target.value)} placeholder="Nº do box" className="h-9 w-28" inputMode="decimal" /><Button type="submit" variant="outline" size="icon" aria-label="Localizar box" title="Localizar box"><Search className="h-4 w-4" /></Button></div>
        </form>
        <div className="grid min-w-48 gap-1">
          <Label className="text-xs text-muted-foreground">Fases exibidas: {last === 0 ? "única" : `${visibleFrom + 1} a ${last + 1} de ${last + 1}`}</Label>
          <Slider min={0} max={Math.max(last, 1)} step={1} value={[Math.min(k, last)]} onValueChange={([v]) => setK(v)} disabled={last === 0} className="h-9" />
        </div>
        {process ? null : <Button variant="outline" onClick={() => setShowCritical((v) => !v)} className={cn(showCritical && "!bg-primary !text-primary-foreground")}><RouteIcon className="h-4 w-4" />Caminho crítico</Button>}
        {data.role === "admin" ? <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} className="text-primary" aria-label="Padrões dos boxes" title="Padrões dos boxes"><Settings2 className="h-4 w-4" /></Button> : null}
        {canEdit ? <Button variant="ghost" size="icon" className="text-primary" onClick={() => openDialog({ mode: "create", kind: "objective", parentId: null, process })} aria-label={process ? "Nova etapa" : "Novo objetivo"} title={process ? "Nova etapa" : "Novo objetivo"}><Plus className="h-5 w-5" /></Button> : null}
      </div>
      {objective ? (
        <div className="overflow-auto rounded-xl border border-border bg-card p-6" onClick={() => setHighlight(null)}>
          <div className="w-max min-w-full pt-3" onClick={(e) => e.stopPropagation()}>{renderBranch(objective)}</div>
        </div>
      ) : <p className="py-16 text-center text-muted-foreground">{process ? (objectives.length ? "Selecione um fluxograma." : "Nenhum fluxograma cadastrado. Use o + para criar a primeira etapa.") : objectives.length ? "Selecione um objetivo." : "Nenhum objetivo cadastrado. Use o + para criar o primeiro."}</p>}
      <ImportBlockDialog target={importTarget} onClose={() => setImportTarget(null)} data={data} />
      <BoxTaskDialog selection={taskSelection} onSelect={setTaskSelection} onClose={() => setTaskSelection(null)} data={data} canEdit={canEdit} />
      <BoxSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} box={data.box} />
    </div>
  );
}

function BoxSettingsDialog({ open, onClose, box }: { open: boolean; onClose: () => void; box: { width: number; height: number } }) {
  const queryClient = useQueryClient();
  const [width, setWidth] = useState(String(box.width));
  const [height, setHeight] = useState(String(box.height));
  useEffect(() => { if (open) { setWidth(String(box.width)); setHeight(String(box.height)); } }, [open, box]);
  const save = useMutation({
    mutationFn: async () => {
      const w = Number(width), h = Number(height);
      if (!(w >= 160 && w <= 480) || !(h >= 64 && h <= 240)) throw new Error("Largura entre 160 e 480 px; altura entre 64 e 240 px.");
      const { error } = await supabase.from("mytosis_settings").update({ box_width: w, box_height: h }).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Padrões salvos."); queryClient.invalidateQueries({ queryKey: ["mytosis"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle className="font-normal">Padrões dos boxes</DialogTitle><DialogDescription>Todos os boxes usam a mesma largura e altura.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5"><Label>Largura (px)</Label><Input type="number" value={width} onChange={(e) => setWidth(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Altura (px)</Label><Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button variant="outline" onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button></DialogFooter>
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
        const parent = n.id === sourceId ? target.id : idMap.get(n.parent_id!)!;
        const { data: created, error } = await supabase.from("mytosis_nodes").insert({
          kind: "task", title: n.title, description: n.description, parent_id: parent, responsible_id: n.responsible_id,
          due_date: null, weight: 0, progress: 0, shape: n.shape, fill_color: n.fill_color, border_color: n.border_color, position: n.id === sourceId ? position : n.position, is_process: !!target.is_process,
        }).select("id").single();
        if (error) throw error;
        idMap.set(n.id, created.id);
      }
      if (internalLinks.length) {
        const { error } = await supabase.from("mytosis_links").insert(internalLinks.map((l) => ({ predecessor_id: idMap.get(l.predecessor_id)!, successor_id: idMap.get(l.successor_id)!, style: l.style })));
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
