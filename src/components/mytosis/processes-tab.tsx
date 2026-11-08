import { CdeButton } from "@/components/cde/cde-button";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, Pencil, Trash2, Workflow } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Json } from "@/integrations/supabase/types";
import { numberedProcessSections, processContentError, reorderProcessSections, type ProcessSection, type TextProcess } from "@/lib/mytosis-processes";
import { computeBoxNumbers, descendantIds } from "@/lib/mytosis";
import { Flowchart } from "./flowchart";
import type { MytosisData } from "./use-mytosis";

type NumberedSection = ReturnType<typeof numberedProcessSections>[number];

function SectionRow({ section, editing, onChange, onDelete }: { section: NumberedSection; editing: boolean; onChange: (section: ProcessSection) => void; onDelete: () => void }) {
  const [open, setOpen] = useState(true);
  const { setNodeRef, attributes, listeners, transform, transition } = useSortable({ id: section.id, disabled: !editing });
  return <section ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="border-b border-border py-4">
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="ghost" className="h-8 w-8 shrink-0 rounded-md !bg-primary/10 !text-primary p-0" {...attributes} {...listeners} aria-label={`Ordenar seção ${section.number}`} title="Ordenar seção" disabled={!editing}>{section.number}</Button>
        {editing ? <Input aria-label={`Título da seção ${section.number}`} value={section.title} onChange={(e) => onChange({ ...section, title: e.target.value })} className="min-w-0 flex-1" /> : <h3 className="min-w-0 break-words text-base font-normal">{section.title}</h3>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {editing ? <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" aria-label={`Excluir seção ${section.number}`} title="Excluir seção" onClick={onDelete}><Trash2 className="size-3.5" /></Button> : null}
        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" aria-label={`${open ? "Recolher" : "Exibir"} seção ${section.number}`} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</Button>
      </div>
    </header>
    {open ? <div className="mt-4 grid gap-3">
      {section.paragraphs.map((paragraph) => <div key={paragraph.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
        <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 px-1 text-xs text-primary">{paragraph.number}</span>
        {editing ? <Textarea aria-label={`Parágrafo ${paragraph.number}`} value={paragraph.text} onChange={(e) => onChange({ ...section, paragraphs: section.paragraphs.map((p) => p.id === paragraph.id ? { id: p.id, text: e.target.value } : p) })} className="min-h-24" /> : <p className="min-w-0 whitespace-pre-wrap break-words text-sm leading-6">{paragraph.text}</p>}
        {editing ? <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" aria-label={`Excluir parágrafo ${paragraph.number}`} title="Excluir parágrafo" onClick={() => { if (window.confirm("Excluir este parágrafo?")) onChange({ ...section, paragraphs: section.paragraphs.filter((p) => p.id !== paragraph.id) }); }}><Trash2 className="size-3.5" /></Button> : <span />}
      </div>)}
      {editing ? <CdeButton group="plus" screen="components/mytosis/processes-tab.tsx" onClick={() => onChange({ ...section, paragraphs: [...section.paragraphs, { id: crypto.randomUUID(), text: "" }] })} className="justify-self-start">Parágrafo</CdeButton> : null}
    </div> : null}
  </section>;
}

export function ProcessesTab({ data, canEdit }: { data: MytosisData; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const { data: processes = [], isPending, error } = useQuery({ queryKey: ["mytosis-processes"], queryFn: async () => {
    const { data: rows, error } = await supabase.from("mytosis_processes").select("*").order("created_at");
    if (error) throw error;
    return (rows ?? []).map((row) => ({ ...row, sections: row.sections as unknown as ProcessSection[], stage_bindings: row.stage_bindings as unknown as TextProcess["stage_bindings"] }));
  } });
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<TextProcess | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [flowToImport, setFlowToImport] = useState("");
  const [previewId, setPreviewId] = useState("");
  const selected = processes.find((p) => p.id === selectedId) ?? processes[0];
  const current = draft ?? selected;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const roots = data.nodes.filter((n) => n.is_process && !n.parent_id);
  const numbers = computeBoxNumbers(data.nodes, data.links);
  const departments = [...new Set(processes.flatMap((p) => p.stage_bindings.map((b) => b.department)).filter(Boolean))];
  const updateDraft = (next: TextProcess) => setDraft(next);
  const save = useMutation({ mutationFn: async (value: TextProcess) => {
    const validation = processContentError(value); if (validation) throw new Error(validation);
    const fields = { name: value.name.trim(), sections: value.sections as unknown as Json, flow_ids: value.flow_ids, stage_bindings: value.stage_bindings as unknown as Json };
    if (value.id) {
      const { data: updated, error } = await supabase.from("mytosis_processes").update(fields).eq("id", value.id).eq("revision", value.revision).select("id").maybeSingle();
      if (error) throw error;
      if (!updated) throw new Error("Este Processo foi alterado por outra pessoa. Cancele e reabra para carregar a versão atual.");
      return updated.id;
    }
    const { data: created, error } = await supabase.from("mytosis_processes").insert(fields).select("id").single();
    if (error) throw error; return created.id;
  }, onSuccess: async (id) => { await queryClient.invalidateQueries({ queryKey: ["mytosis-processes"] }); setSelectedId(id); setDraft(null); toast.success("Processo salvo."); }, onError: (e: Error) => toast.error(e.message) });
  const remove = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from("mytosis_processes").delete().eq("id", id); if (error) throw error; }, onSuccess: async () => { setSelectedId(""); setDraft(null); await queryClient.invalidateQueries({ queryKey: ["mytosis-processes"] }); toast.success("Processo excluído."); }, onError: (e: Error) => toast.error(e.message) });
  function onDragEnd(event: DragEndEvent) {
    if (!draft || !event.over) return;
    updateDraft({ ...draft, sections: reorderProcessSections(draft.sections, String(event.active.id), String(event.over.id)) });
  }
  if (isPending) return <p className="text-sm text-muted-foreground">Carregando Processos…</p>;
  if (error) return <p role="alert" className="text-sm text-destructive">Não foi possível carregar os Processos.</p>;
  return <div className="space-y-5">
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
      <div className="grid min-w-0 gap-1.5"><Label>Processo</Label><SearchableSelect aria-label="Processo" disabled={!!draft || save.isPending} value={selected?.id ?? ""} onChange={setSelectedId} options={processes.map((p, i) => ({ value: p.id, label: `${i + 1} ${p.name}` }))} placeholder="Selecione o Processo" /></div>
      {canEdit ? <div className="flex shrink-0 gap-1">
        {selected && !draft ? <Button variant="outline" size="icon" className="h-8 w-8" title="Editar Processo" aria-label="Editar Processo" onClick={() => setDraft(structuredClone(selected))}><Pencil className="size-3.5" /></Button> : null}
        <CdeButton group="plus" screen="components/mytosis/processes-tab.tsx" disabled={!!draft} title="Novo Processo" aria-label="Novo Processo" onClick={() => setDraft({ id: "", name: "", sections: [], flow_ids: [], stage_bindings: [], revision: 1 })}></CdeButton>
      </div> : null}
    </header>
    {current ? <>
      {draft ? <div className="grid gap-1.5"><Label htmlFor="process-name">Nome do Processo</Label><Input id="process-name" value={draft.name} onChange={(e) => updateDraft({ ...draft, name: e.target.value })} autoFocus /></div> : <h2 className="break-words text-xl font-normal">{current.name}</h2>}
      <fieldset disabled={save.isPending || remove.isPending} className="min-w-0">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}><SortableContext items={current.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {numberedProcessSections(current.sections).map((section) => <SectionRow key={section.id} section={section} editing={!!draft} onChange={(next) => updateDraft({ ...current, sections: current.sections.map((s) => s.id === next.id ? next : s) })} onDelete={() => { if (window.confirm("Excluir esta seção e seus parágrafos?")) updateDraft({ ...current, sections: current.sections.filter((s) => s.id !== section.id) }); }} />)}
        </SortableContext></DndContext>
        {draft ? <CdeButton group="plus" screen="components/mytosis/processes-tab.tsx" onClick={() => updateDraft({ ...draft, sections: [...draft.sections, { id: crypto.randomUUID(), title: "", paragraphs: [] }] })} className="mt-4">Seção</CdeButton> : null}
        <div className="mt-6 grid gap-4 border-t border-border pt-5">
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><h3 className="text-base font-normal">Fluxogramas</h3>{draft ? <Button variant="outline" size="sm" onClick={() => { setFlowToImport(""); setImportOpen(true); }}><Workflow className="size-3.5" />Importar</Button> : null}</header>
          {current.flow_ids.map((id) => {
            const root = roots.find((n) => n.id === id); const scope = descendantIds(id, data.nodes);
            const stages = data.nodes.filter((n) => scope.has(n.id) && n.id !== id).sort((a, b) => (numbers.get(a.id) ?? "").localeCompare(numbers.get(b.id) ?? "", "pt-BR", { numeric: true }));
            return <div key={id} className="grid gap-3 border-b border-border pb-4">
              <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><Button variant="ghost" className="min-w-0 justify-start px-0 text-foreground hover:text-primary" disabled={!root} onClick={() => setPreviewId(id)}><Workflow className="size-4 shrink-0" /><span className="truncate">{root ? `${numbers.get(id)} ${root.title}` : "Fluxograma indisponível"}</span></Button>{draft ? <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" title="Remover vínculo" aria-label={`Remover fluxograma ${root?.title ?? id}`} onClick={() => { if (window.confirm("Remover o vínculo com este fluxograma? O original será preservado.")) updateDraft({ ...draft, flow_ids: draft.flow_ids.filter((f) => f !== id), stage_bindings: draft.stage_bindings.filter((b) => !scope.has(b.node_id)) }); }}><Trash2 className="size-3.5" /></Button> : null}</header>
              {stages.map((stage) => {
                const binding = current.stage_bindings.find((b) => b.node_id === stage.id) ?? { node_id: stage.id, department: "", responsible_id: null };
                const setBinding = (next: typeof binding) => updateDraft({ ...current, stage_bindings: [...current.stage_bindings.filter((b) => b.node_id !== stage.id), next] });
                return <div key={stage.id} className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                  <p className="min-w-0 break-words text-sm sm:pt-6"><span className="mr-2 text-primary">{numbers.get(stage.id)}</span>{stage.title}</p>
                  <div className="grid min-w-0 gap-1"><Label className="text-xs text-muted-foreground">Departamento</Label>{draft ? <Input list="process-departments" aria-label={`Departamento da etapa ${numbers.get(stage.id)}`} value={binding.department} onChange={(e) => setBinding({ ...binding, department: e.target.value })} /> : <p className="break-words text-sm">{binding.department || "—"}</p>}</div>
                  <div className="grid min-w-0 gap-1"><Label className="text-xs text-muted-foreground">Responsável</Label>{draft ? <SearchableSelect aria-label={`Responsável da etapa ${numbers.get(stage.id)}`} value={binding.responsible_id ?? ""} onChange={(value) => setBinding({ ...binding, responsible_id: value || null })} options={data.users.map((u) => ({ value: u.id, label: u.full_name }))} placeholder="Selecione" /> : <p className="break-words text-sm">{data.users.find((u) => u.id === binding.responsible_id)?.full_name ?? "—"}</p>}</div>
                </div>;
              })}
            </div>;
          })}
          <datalist id="process-departments">{departments.map((name) => <option key={name} value={name} />)}</datalist>
        </div>
      </fieldset>
      {draft ? <div className="flex justify-end gap-2 border-t border-border pt-4"><Button variant="outline" disabled={save.isPending} onClick={() => { if (window.confirm("Cancelar a edição e descartar as alterações não salvas?")) setDraft(null); }}>Cancelar</Button><Button variant="outline" disabled={save.isPending} onClick={() => save.mutate(draft)}>Salvar</Button></div> : canEdit ? <Button variant="outline" size="sm" disabled={remove.isPending} onClick={() => { if (window.confirm(`Excluir o Processo ${current.name}? Os fluxogramas originais serão preservados.`)) remove.mutate(current.id); }}>Excluir</Button> : null}
    </> : <p className="py-10 text-sm text-muted-foreground">Nenhum Processo cadastrado.</p>}
    <Dialog open={importOpen} onOpenChange={setImportOpen}><DialogContent><DialogHeader><DialogTitle className="font-normal">Importar fluxograma</DialogTitle></DialogHeader><SearchableSelect aria-label="Fluxograma para importar" value={flowToImport} onChange={setFlowToImport} options={roots.filter((root) => !draft?.flow_ids.includes(root.id)).map((root) => ({ value: root.id, label: `${numbers.get(root.id)} ${root.title}` }))} placeholder="Selecione o fluxograma" /><DialogFooter><Button variant="outline" onClick={() => setImportOpen(false)}>Cancelar</Button><Button variant="outline" disabled={!flowToImport || !draft} onClick={() => { if (!draft || !flowToImport) return; updateDraft({ ...draft, flow_ids: [...draft.flow_ids, flowToImport] }); setImportOpen(false); }}>Confirmar</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!previewId} onOpenChange={(open) => { if (!open) setPreviewId(""); }}><DialogContent className="max-h-[90vh] overflow-auto sm:max-w-[1200px]"><DialogHeader><DialogTitle className="font-normal">{roots.find((n) => n.id === previewId)?.title ?? "Fluxograma"}</DialogTitle></DialogHeader>{previewId ? <Flowchart process data={{ ...data, role: "viewer" }} canEdit={false} objectiveId={previewId} onObjectiveChange={setPreviewId} focusLocator={null} onFocusHandled={() => {}} openDialog={() => {}} /> : null}</DialogContent></Dialog>
  </div>;
}