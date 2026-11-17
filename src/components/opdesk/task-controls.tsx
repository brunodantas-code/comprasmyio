import type { ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TaskPriority, TaskStatus } from "./task-model";

export function TaskIconButton({label,children,...props}:ButtonProps & {label:string}) {
  return <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" aria-label={label} {...props}>{children}</Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
}
export function TaskSelect({label,value,options,onChange}: {label:string;value:string;options:readonly string[];onChange:(v:string)=>void}) {
  return <div className="min-w-0 space-y-1"><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{options.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>;
}
export function TaskStatusBadge({status}:{status:TaskStatus}) {
  const classes:Record<TaskStatus,string>={Aguardando:"opdesk-status-waiting",Pendente:"opdesk-status-pending","Em Execução":"opdesk-status-execution","Em Revisão":"opdesk-status-review",Concluída:"opdesk-status-completed",Fechado:"opdesk-status-closed"};
  return <Badge variant="outline" className={classes[status]}>{status}</Badge>;
}
export function TaskPriorityBadge({priority}:{priority:TaskPriority}) {
  return <Badge variant="outline" className={`opdesk-priority-${({Baixa:"low",Média:"medium",Alta:"high",Urgente:"urgent"})[priority]}`}>{priority}</Badge>;
}
export function BlockedTaskDialog({message,onClose}:{message:string | null;onClose:()=>void}) {
  return <Dialog open={!!message} onOpenChange={o=>{if(!o)onClose();}}><DialogContent><DialogHeader><DialogTitle>Alteração bloqueada</DialogTitle><DialogDescription className="whitespace-pre-wrap">{message}</DialogDescription></DialogHeader></DialogContent></Dialog>;
}
export function TaskField({label,children}:{label:string;children:ReactNode}) {return <div className="min-w-0 space-y-1"><Label>{label}</Label>{children}</div>;}