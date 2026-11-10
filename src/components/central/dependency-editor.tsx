import { useState } from 'react';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { Link2,Save,Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { Dialog,DialogContent,DialogHeader,DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select,SelectTrigger,SelectValue,SelectContent,SelectItem } from '@/components/ui/select';
import { confirmAction } from '@/components/confirm-dialog';
import { centralItems,wouldCycle,type SourceKind } from '@/lib/central-pending';
import { centralOptions } from './data';
export const MILESTONES:Record<string,string>={completed:'Conclusão',approved:'Aprovação',purchased:'Compra realizada',received:'Recebimento sem problema'};
export function DependencyEditor({kind,sourceId}:{kind:SourceKind;sourceId:string}){
 const {data:me}=useCurrentUser();const [open,setOpen]=useState(false);const [parent,setParent]=useState('');const [milestone,setMilestone]=useState('completed');const [busy,setBusy]=useState(false);const qc=useQueryClient();
 const q=useQuery({...centralOptions,enabled:!!me?.isAdmin&&open});
 if(!me?.isAdmin)return null;
 const items=q.data?centralItems(q.data):[];const own=items.find(i=>i.kind===kind&&i.sourceId===sourceId);const pred=items.find(i=>i.key===parent);const deps=q.data?.dependencies??[];
 const links=deps.filter(d=>d.successor_kind===kind&&d.successor_id===sourceId);
 async function save(){if(!pred||!own||busy)return;if(wouldCycle(deps,pred.key,own.key)){toast.error('Este vínculo criaria uma dependência circular.');return;}setBusy(true);try{const r=await supabase.from('central_dependencies').insert({predecessor_kind:pred.kind,predecessor_id:pred.sourceId,successor_kind:kind,successor_id:sourceId,milestone}).select('id').single();if(r.error)throw r.error;await qc.invalidateQueries({queryKey:['central-admin']});setParent('');toast.success('Dependência salva');}catch(e){toast.error(e instanceof Error?e.message:'Não foi possível salvar o vínculo');}finally{setBusy(false);}}
 return <><Button variant="ghost" size="compactIcon" title="Esta pendência depende de outra?" aria-label="Vincular dependência" onClick={()=>setOpen(true)}><Link2/></Button><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Dependências{own?` · ${own.title}`:''}</DialogTitle></DialogHeader>{q.isPending?<p>Carregando pendências...</p>:q.error?<p role="alert" className="text-destructive">Não foi possível consultar as pendências.</p>:<div className="space-y-4"><Label>Esta pendência depende de outra?</Label><SearchableSelect aria-label="Pendência predecessora" value={parent} onChange={v=>{setParent(v);setMilestone(items.find(i=>i.key===v)?.kind==='supply'?'received':'completed');}} placeholder="Buscar pendência, App ou responsável" options={items.filter(i=>i.key!==own?.key&&!i.completed&&!i.canceled).map(i=>({value:i.key,label:`${i.app} · ${i.title}`,keywords:i.users.map(id=>q.data?.users.find(u=>u.id===id)?.full_name??'').join(' ')}))}/><Label>Libera após</Label><Select value={milestone} onValueChange={setMilestone}><SelectTrigger aria-label="Marco de liberação"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(MILESTONES).filter(([k])=>pred?.kind==='supply'||k==='completed').map(([k,v])=><SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select><div className="flex justify-end"><Button variant="ghost" size="compactIcon" title="Salvar dependência" aria-label="Salvar dependência" disabled={!parent||busy} onClick={()=>void save()}><Save/></Button></div>{links.map(d=>{const p=items.find(i=>i.kind===d.predecessor_kind&&i.sourceId===d.predecessor_id);return <div key={d.id} className="flex items-center justify-between gap-2 text-sm"><span>{p?.title??'Origem removida — revisar vínculo'} · {MILESTONES[d.milestone]}</span><Button variant="ghost" size="compactIcon" aria-label="Remover dependência" title="Remover dependência" onClick={async()=>{if(!await confirmAction('Remover esta dependência? O histórico será preservado.'))return;const r=await supabase.from('central_dependencies').delete().eq('id',d.id).select('id').single();if(r.error){toast.error('Não foi possível remover');return;}await qc.invalidateQueries({queryKey:['central-admin']});}}><Trash2/></Button></div>;})}</div>}</DialogContent></Dialog></>;
}
