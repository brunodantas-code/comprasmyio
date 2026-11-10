import { useState } from 'react';
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { History, Pencil, Save, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CdeButton, CdeNumber, CdeNumberButton } from '@/components/cde/cde-button';
import { CdeSortableList } from '@/components/cde/cde-order';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MilestoneTimeline } from '@/components/milestone-timeline';
import { useMinutesAlerts } from '@/components/cde/cde-deadline-alerts';
import { legalActionSchema, legalObservationSchema, legalTrackingOptions, legalActionDelayDays, legalActionDueSoonDays, canRemoveLegalObservation, orderedLegalActions, type DraftLegalAction } from '@/lib/legal-actions';
import { confirmAction } from '@/components/confirm-dialog';
import { legalDate } from '@/lib/legal';
import { signatureDate } from '@/lib/signatures';

export function SubjectActions({ recordId, subjectId, userId, saved = true, drafts = [], onDraftsChange }: { recordId: string; subjectId: string; userId?: string; saved?: boolean; drafts?: DraftLegalAction[]; onDraftsChange?: (actions: DraftLegalAction[]) => void }) {
  const { data } = useSuspenseQuery(legalTrackingOptions); const qc = useQueryClient();
  const minutesAlerts = useMinutesAlerts();
  const actions = [...orderedLegalActions(data.actions.filter(a => a.record_id === recordId && a.subject_id === subjectId && !a.archived)), ...drafts.filter(a => a.subject_id === subjectId).map(a => ({...a,completed_at:null}))];
  const [editor, setEditor] = useState<{ id?: string; title: string; responsible_id: string; due_date: string } | null>(null);
  const [note, setNote] = useState<{ actionId: string; id?: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false); const [openActions, setOpenActions] = useState<Set<string>>(new Set()); const [historyOpen, setHistoryOpen] = useState(false);
  const logs = data.logs.filter(l => l.record_id === recordId && l.subject_id === subjectId);
  async function reorderActions(ids: string[]) {
    if (busy) return;
    const draftIds=new Set(drafts.map(a=>a.id));
    const savedIds=ids.filter(id=>!draftIds.has(id));
    if(ids.some((id,index)=>draftIds.has(id)&&index<savedIds.length)) { toast.error('Salve as ações novas antes de misturá-las às ações existentes'); return; }
    if(onDraftsChange) onDraftsChange([...drafts.filter(a=>a.subject_id!==subjectId),...ids.flatMap(id=>drafts.filter(a=>a.id===id))]);
    if(savedIds.length) await mutate(()=>supabase.rpc('legal_reorder_actions',{p_record_id:recordId,p_subject_id:subjectId,p_action_ids:savedIds}));
    await qc.invalidateQueries({queryKey:['legal-records']});
  }
  async function mutate(operation: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true);
    try { const result = await operation(); if (result.error) throw new Error(result.error.message); await Promise.all([qc.invalidateQueries({ queryKey: ['legal-tracking'] }), qc.invalidateQueries({ queryKey: ['pending-actions'] })]); return true; }
    catch(e) { toast.error(e instanceof Error ? e.message : 'Não foi possível salvar'); return false; } finally { setBusy(false); }
  }
  async function saveAction(e: React.FormEvent) {
    e.preventDefault(); if (!editor) return;
    const parsed = legalActionSchema.safeParse(editor);
    if (!parsed.success) { toast.error('Informe a ação e selecione o responsável'); return; }
    const payload = { ...parsed.data, responsible_name: data.users.find(u => u.id === parsed.data.responsible_id)?.full_name || '' };
    if (onDraftsChange && (!saved || drafts.some(a => a.id === editor.id))) {
      const action = { ...payload, id: editor.id ?? crypto.randomUUID(), subject_id: subjectId };
      onDraftsChange(editor.id ? drafts.map(a => a.id === editor.id ? action : a) : [...drafts, action]);
      setEditor(null);
      return;
    }
    const ok = await mutate(() => editor.id ? supabase.from('legal_actions').update(payload).eq('id',editor.id).select('id').single() : supabase.from('legal_actions').insert({ ...payload, record_id: recordId, subject_id: subjectId }).select('id').single());
    if(ok) { setEditor(null); toast.success('Ação salva'); }
  }
  async function saveNote(e: React.FormEvent) {
    e.preventDefault(); if (!note) return;
    const parsed = legalObservationSchema.safeParse(note.message);
    if (!parsed.success) { toast.error('Informe a observação'); return; }
    const ok = await mutate(() => note.id ? supabase.from('legal_action_observations').update({ message: parsed.data }).eq('id',note.id).select('id').single() : supabase.from('legal_action_observations').insert({ action_id: note.actionId, message: parsed.data }).select('id').single());
    if(ok) { setNote(null); toast.success('Observação salva'); }
  }
  return <div className="space-y-4 border-t border-border pt-4">
    <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-semibold">Ações</h4><CdeButton group="plus" screen="components/legal/subject-actions.tsx" disabled={(!saved && !onDraftsChange) || busy} title="Adicionar ação" aria-label="Adicionar ação" onClick={()=>setEditor({title:'',responsible_id:'',due_date:''})} /></div>
    <CdeSortableList ids={actions.map(a=>a.id)} labelOf={id=>actions.find(a=>a.id===id)?.title ?? 'ação'} onMove={reorderActions} className="space-y-4">{(id,index,handle)=>{const action=actions.find(a=>a.id===id);if(!action)return null;return <div key={action.id} className="space-y-3 pb-3">
      <div className="flex items-start gap-2"><span className="flex h-7 shrink-0 items-center">{handle}</span><CdeNumber subcategory screen="components/legal/subject-actions.tsx">{index+1}</CdeNumber><Checkbox className="mt-1" checked={Boolean(action.completed_at)} disabled={busy || drafts.some(a => a.id === action.id)} aria-label={`Concluir ação ${index+1}: ${action.title}`} onCheckedChange={checked=>mutate(()=>supabase.from('legal_actions').update({completed_at:checked ? new Date().toISOString() : null}).eq('id',action.id).select('id').single())} /><div className="min-w-0 flex-1"><p className="whitespace-pre-wrap break-words text-sm">{action.title}</p><p className="text-xs text-muted-foreground">Responsável: {action.responsible_name}</p>{action.due_date && <p className="text-xs text-muted-foreground">Conclusão prevista: {legalDate(action.due_date)}</p>}{legalActionDueSoonDays(action, minutesAlerts.warningDays) !== null && <p className="text-xs text-destructive" role="status">{legalActionDueSoonDays(action, minutesAlerts.warningDays) === 0 ? 'Vence hoje' : `Vence em ${legalActionDueSoonDays(action, minutesAlerts.warningDays)} dia(s)`}</p>}{legalActionDelayDays(action) > 0 && <p className="text-xs text-destructive" role="status">Atrasada há {legalActionDelayDays(action)} dia(s)</p>}{action.completed_at && <p className="text-xs text-muted-foreground">Concluída em {signatureDate(action.completed_at)}</p>}</div><Button variant="ghost" size="compactIcon" title="Editar ação" aria-label={`Editar ação ${index+1}`} onClick={()=>setEditor({id:action.id,title:action.title,responsible_id:action.responsible_id,due_date:action.due_date ?? ''})}><Pencil /></Button><Button variant="ghost" size="compactIcon" title={openActions.has(action.id)?'Recolher':'Exibir'} aria-label={`${openActions.has(action.id)?'Recolher':'Exibir'} ação ${index+1}`} aria-expanded={openActions.has(action.id)} onClick={()=>setOpenActions(prev=>{const n=new Set(prev);if(n.has(action.id))n.delete(action.id);else n.add(action.id);return n;})}>{openActions.has(action.id)?<ChevronUp />:<ChevronDown />}</Button></div>
      {openActions.has(action.id) && 
<div className="flex items-start gap-2"><span aria-hidden="true" className="w-4 shrink-0" /><span aria-hidden="true" className="invisible shrink-0"><CdeNumber subcategory screen="components/legal/subject-actions.tsx">{index+1}</CdeNumber></span><span aria-hidden="true" className="mt-1 size-4 shrink-0" /><div className="min-w-0 flex-1 space-y-2"><div className="flex items-center justify-between gap-2"><h5 className="text-sm">Observações</h5><CdeButton group="plus" screen="components/legal/subject-actions.tsx" disabled={drafts.some(a => a.id === action.id)} title="Adicionar observação" aria-label={`Adicionar observação à ação ${index+1}`} onClick={()=>setNote({actionId:action.id,message:''})} /></div>{data.observations.filter(o=>o.action_id===action.id).map(o=><div key={o.id} className="pb-2"><div className="flex items-start gap-2"><p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm">{o.message}</p>{canRemoveLegalObservation(o.author_id,userId) && <><Button variant="ghost" size="compactIcon" title="Editar observação" aria-label="Editar observação" onClick={()=>setNote({actionId:action.id,id:o.id,message:o.message})}><Pencil /></Button><Button variant="ghost" size="compactIcon" disabled={busy} title="Excluir observação" aria-label="Excluir observação" onClick={async()=>{if(!await confirmAction("Excluir esta observação? O registro será preservado no histórico.", {title:"Excluir observação"}))return; const ok=await mutate(()=>supabase.from('legal_action_observations').update({deleted_at:new Date().toISOString()}).eq('id',o.id).select('id').single());if(ok)toast.success("Observação excluída");}}><Trash2 /></Button></>}</div><p className="mt-1 text-xs text-muted-foreground">{o.author_name} · {signatureDate(o.updated_at)}</p></div>)}</div></div>}
    </div>;}}</CdeSortableList>
    <div className="space-y-3 pt-3"><div className="flex items-center gap-2"><History className="h-4 w-4" /><h4 className="flex-1 text-sm font-semibold">Histórico</h4><Button variant="ghost" size="compactIcon" title={historyOpen?'Recolher histórico':'Exibir histórico'} aria-label={historyOpen?'Recolher histórico':'Exibir histórico'} onClick={()=>setHistoryOpen(!historyOpen)}>{historyOpen?<ChevronUp/>:<ChevronDown/>}</Button></div>{historyOpen && <MilestoneTimeline entries={logs.map(l=>({id:l.id,created_at:l.created_at,text:l.text}))} />}</div>
    <Dialog open={Boolean(editor)} onOpenChange={open=>{if(!open&&!busy)setEditor(null);}}><DialogContent><DialogHeader><DialogTitle>{editor?.id?'Editar ação':'Nova ação'}</DialogTitle></DialogHeader><form onSubmit={saveAction} className="space-y-3"><Label htmlFor="legal-action-title">Ação</Label><Input id="legal-action-title" value={editor?.title||''} maxLength={1000} onChange={e=>setEditor(value=>value?{...value,title:e.target.value}:value)} /><Label>Responsável</Label><SearchableSelect aria-label="Responsável pela ação" value={editor?.responsible_id||''} onChange={responsible_id=>setEditor(value=>value?{...value,responsible_id}:value)} options={data.users.map(u=>({value:u.id,label:u.full_name}))} placeholder="Selecione o responsável" /><Label htmlFor="legal-action-due-date">Data prevista de conclusão</Label><Input id="legal-action-due-date" type="date" value={editor?.due_date||''} onChange={e=>setEditor(value=>value?{...value,due_date:e.target.value}:value)} /><div className="flex justify-end"><Button type="submit" disabled={busy}><Save/>Salvar</Button></div></form></DialogContent></Dialog>
    <Dialog open={Boolean(note)} onOpenChange={open=>{if(!open&&!busy)setNote(null);}}><DialogContent><DialogHeader><DialogTitle>{note?.id?'Editar observação':'Nova observação'}</DialogTitle></DialogHeader><form onSubmit={saveNote} className="space-y-3"><Label htmlFor="legal-action-note">Observação</Label><Textarea id="legal-action-note" maxLength={4000} value={note?.message||''} onChange={e=>setNote(value=>value?{...value,message:e.target.value}:value)} /><div className="flex justify-end"><Button type="submit" disabled={busy || !note?.message.trim()}><Save/>Salvar</Button></div></form></DialogContent></Dialog>
  </div>;
}