import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog,DialogContent,DialogHeader,DialogTitle } from '@/components/ui/dialog';
import { Table,TableHeader,TableHead,TableRow,TableBody,TableCell } from '@/components/ui/table';
import { orderTiming, type DeadlineOrder } from '@/lib/supply-deadlines';
import { ChartNoAxesCombined } from 'lucide-react';
export function SupplyDeadlineIndicators({orders}:{orders:DeadlineOrder[]}) {
 const [open,setOpen]=useState(false); const ids=orders.map(o=>o.id);
 const {data,isPending,error}=useQuery({queryKey:['supply-timing',ids],enabled:open && ids.length>0,queryFn:async()=>{
   const [logs,steps]=await Promise.all([supabase.from('order_logs').select('order_id,action,details,created_at').in('order_id',ids),supabase.from('approval_steps').select('order_id,status,decided_at').in('order_id',ids)]);
   if(logs.error||steps.error) throw logs.error||steps.error;
   return orders.map(o=>({order:o,...orderTiming(o,logs.data??[],steps.data??[])}));
 }});
 const rows=data??[];
 const average=(key:'requestToApproval'|'approvalToPurchase'|'purchaseToDelivery')=>{const values=rows.flatMap(r=>r[key]===null?[]:[r[key]]);return values.length?`${(values.reduce((a,b)=>a+b,0)/values.length).toFixed(1)} dias (${values.length})`:'Sem histórico suficiente';};
 return <><Button variant="outline" size="sm" onClick={()=>setOpen(true)}><ChartNoAxesCombined className="h-4 w-4"/>Indicadores de prazos</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-5xl"><DialogHeader><DialogTitle>Indicadores de prazos</DialogTitle></DialogHeader>{error?<p className="text-destructive">Não foi possível consultar o histórico autorizado.</p>:isPending && ids.length?<p>Carregando…</p>:<><dl className="grid gap-4 sm:grid-cols-2"><div><dt>Pedido → Aprovação</dt><dd>{average('requestToApproval')}</dd></div><div><dt>Aprovação → Compra</dt><dd>{average('approvalToPurchase')}</dd></div><div><dt>Compra → Entrega</dt><dd>{average('purchaseToDelivery')}</dd></div><div><dt>Entregues fora do prazo</dt><dd>{rows.filter(r=>r.late).length} de {rows.filter(r=>r.delivered).length} com entrega registrada</dd></div></dl><Table><TableHeader><TableRow><TableHead>Pedido</TableHead><TableHead>Aprovação</TableHead><TableHead>Compra</TableHead><TableHead>Entrega</TableHead><TableHead>Ocorrências registradas</TableHead></TableRow></TableHeader><TableBody>{rows.map(r=><TableRow key={r.order.id}><TableCell>{'approval_number' in r.order?String(r.order.approval_number):r.order.id}</TableCell><TableCell>{r.approved?.slice(0,10)||'—'}</TableCell><TableCell>{r.purchased?.slice(0,10)||'—'}</TableCell><TableCell>{r.delivered?.slice(0,10)||'—'}</TableCell><TableCell>{r.markers.join('; ')|| (r.late?'Causa não registrada':'—')}</TableCell></TableRow>)}</TableBody></Table><p className="text-xs text-muted-foreground">Ocorrências não comprovam a causa do atraso. Datas ausentes não entram nas médias. Prazos antigos relativos consideram a semana ou o mês da criação.</p></>}</DialogContent></Dialog></>;
}