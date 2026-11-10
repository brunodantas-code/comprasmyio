import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ClockAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { CdeDisclosureIcon } from '@/components/cde/cde-button';
import { parseLegalContent,legalSubjectResponsibles } from '@/lib/legal';
import { requestedDeadline } from '@/lib/supply-deadlines';
import { dueToday,type CriticalPending } from '@/lib/critical-pending';
export function CriticalGroup(){
 const {data:me}=useCurrentUser();const [open,setOpen]=useState(false);const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
 const q=useQuery({queryKey:['critical-pending',me?.id,today],enabled:!!me,queryFn:async()=>{
 if(!me)return [] as CriticalPending[];
 const [actions,records,completions,allActions,orders,steps,nodes,tasks,todos]=await Promise.all([
 supabase.from('legal_actions').select('id,title,record_id,due_date,completed_at,archived').eq('responsible_id',me.id),supabase.from('legal_records').select('id,title,content').eq('category','minutes'),supabase.from('legal_subject_completions').select('record_id,subject_id'),supabase.from('legal_actions').select('record_id,subject_id,archived'),supabase.from('purchase_orders').select('id,item_name,status,approval_status,created_at,deadline_type,deadline_date,delivery_forecast,payment_date,request_model,requester_id,recipient_user_id'),supabase.from('approval_steps').select('order_id,approver_id,step_index,status').eq('status','pendente'),supabase.from('mytosis_nodes').select('id,title,due_date,progress,is_process').eq('responsible_id',me.id).eq('is_process',false),supabase.from('mytosis_tasks').select('id,node_id,title,due_date,completed').eq('responsible_id',me.id),supabase.from('personal_todos').select('id,title,due_date,status').or(`owner_id.eq.${me.id},shared_user_ids.cs.{${me.id}}`)]);
 for(const r of [actions,records,completions,allActions,orders,steps,nodes,tasks,todos])if(r.error)throw r.error;
 const out:CriticalPending[]=[];
 for(const a of actions.data??[])if(a.due_date===today&&!a.archived&&!a.completed_at)out.push({key:`la:${a.id}`,title:a.title,app:'Legal',due:today,route:'/legal',record:a.record_id});
 for(const r of records.data??[])for(const s of parseLegalContent(r.content).subjects)if(s.completionDate===today&&legalSubjectResponsibles(s).some(n=>n.trim().toLowerCase()===me.full_name.trim().toLowerCase())&&!(allActions.data??[]).some(a=>a.record_id===r.id&&a.subject_id===s.id&&!a.archived)&&!(completions.data??[]).some(c=>c.record_id===r.id&&c.subject_id===s.id))out.push({key:`ls:${r.id}/${s.id}`,title:s.title,app:'Legal',due:today,route:'/legal',record:r.id});
 for(const o of orders.data??[]){const ownStep=(steps.data??[]).some(s=>s.order_id===o.id&&s.approver_id===me.id&&!(steps.data??[]).some(p=>p.order_id===o.id&&p.step_index<s.step_index));if((o.request_model==='pagamento'?o.payment_date:requestedDeadline(o))===today&&!['cancelado','entregue','recebido_ok'].includes(o.status)&&(ownStep||me.isComprador&&o.approval_status==='aprovado'&&o.request_model!=='pagamento'))out.push({key:`o:${o.id}`,title:o.item_name,app:o.request_model==='pagamento'?'Cash Flow':'Supply',due:today,route:'/dashboard',record:o.id});}
 for(const n of nodes.data??[])if(n.due_date===today&&n.progress<100)out.push({key:`n:${n.id}`,title:n.title,app:'Mytosis',due:today,route:'/mytosis',record:n.id});
 for(const t of tasks.data??[])if(t.due_date===today&&!t.completed)out.push({key:`mt:${t.id}`,title:t.title,app:'Mytosis',due:today,route:'/mytosis',record:t.node_id,task:t.id});
 for(const t of todos.data??[])if(t.due_date===today&&!['concluido','excluido'].includes(t.status))out.push({key:`todo:${t.id}`,title:t.title,app:'To Dos',due:today,route:'/pendentes',record:t.id});return out;}});
 const rows=dueToday(q.data??[],today);if(!rows.length)return null;
 return <div><button type="button" onClick={()=>setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-primary/10"><CdeDisclosureIcon open={open} screen="components/central/critical-group.tsx"/><ClockAlert className="size-5 text-destructive"/><span className="w-40 max-w-[40vw] shrink-0 text-sm font-semibold">Prazo crítico</span><span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-destructive px-2 text-xs font-bold text-destructive-foreground">{rows.length}</span></button>{open&&<div className="divide-y divide-border border-t border-border">{rows.map(r=><div key={r.key} className="px-8 py-3 text-sm"><p className="text-xs text-muted-foreground">{r.app} · Vence hoje</p>{r.route==='/legal'?<Link to="/legal" search={{record:r.record}}>{r.title}</Link>:r.route==='/dashboard'?<Link to="/dashboard" search={{order:r.record,section:undefined,subsection:undefined}}>{r.title}</Link>:r.route==='/mytosis'?<Link to="/mytosis" search={{node:r.record,task:r.task}}>{r.title}</Link>:<Link to="/pendentes" search={{todo:r.record}}>{r.title}</Link>}</div>)}</div>}</div>;
}
