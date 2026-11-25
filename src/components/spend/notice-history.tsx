import { useState } from 'react';
import { Bell, Check, History, MessageSquareWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MilestoneTimeline } from '@/components/milestone-timeline';
import type { SpendData } from './data';
import { missingReceiptLabels, missingReceiptReason } from './missing-receipt';
export function SpendNoticeHistory({data,lineId,kind,inline=false}:{data:SpendData;lineId:string;kind?:'notify'|'adjustment';inline?:boolean}) {
 const [open,setOpen]=useState(false);
 const events=data.logs.filter(log=>log.details && typeof log.details==='object' && !Array.isArray(log.details) && log.details['line_id']===lineId && ['notify','adjustment','receipt_missing_response'].includes(log.action));
 const sent=events.some(log=>log.action===kind);
 const Icon=kind==='notify'?Bell:kind==='adjustment'?MessageSquareWarning:History;
 const label=kind==='notify'?'Notificação':kind==='adjustment'?'Pedido de ajuste':'Envios ao portador';
 if(!events.length || (kind&&!sent))return null;
 const entries=events.filter(log=>!kind || log.action===kind || log.action==='receipt_missing_response').map(log=>{
   const detail=log.details && typeof log.details==='object' && !Array.isArray(log.details)?log.details:{};
   const reason=missingReceiptReason.safeParse(detail['reason']);
   const text=log.action==='receipt_missing_response'?`Resposta do portador: ${reason.success?missingReceiptLabels[reason.data]:'Resposta registrada'}`:log.action==='notify'?`Mensagem enviada ao portador: ${String(detail['message']??'')}`:`Pedido de ajuste enviado ao portador: ${String(detail['message']??'')}`;
   return {id:log.id,created_at:log.created_at,text:`${text}\npor ${data.users.find(u=>u.id===log.actor_id)?.name??'Usuário autorizado'}`};
 });
 if(inline)return <section aria-label="Histórico de envios ao portador" className="space-y-2 py-2 pr-4"><h4 className="text-sm text-muted-foreground">Histórico de envios ao portador</h4><MilestoneTimeline entries={entries}/></section>;
 return <><Button variant="ghost" size="icon" className="relative shrink-0" aria-label={`Histórico de ${label.toLowerCase()}`} title={`${label}${sent?' enviado':' registrados'} · ver histórico`} onClick={()=>setOpen(true)}><Icon/>{sent&&<Check className="absolute -right-1 -top-1 size-3 text-primary"/>}</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{label} · Histórico</DialogTitle></DialogHeader><MilestoneTimeline entries={entries}/></DialogContent></Dialog></>;
}
