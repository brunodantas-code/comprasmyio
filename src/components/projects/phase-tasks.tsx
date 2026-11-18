import {useState} from "react";
import {wbsRows} from "./wbs";
import {CdeSortableList} from "@/components/cde/cde-order";
import {CdeNumber,CdeButton} from "@/components/cde/cde-button";
import {Button} from "@/components/ui/button";
import {Pencil,ChevronDown,ChevronRight} from "lucide-react";
import {displayDate,type ScheduledTask} from "./logic";
export function PhaseTasks({tasks,phaseIndex,closed,nameOf,onEdit,onAdd,onReorder}:{tasks:ScheduledTask[];phaseIndex:number;closed:boolean;nameOf:(id:string|null)=>string;onEdit:(id:string)=>void;onAdd:()=>void;onReorder:(ids:string[])=>void}){
 const [collapsed,setCollapsed]=useState<Set<string>>(new Set());const hierarchy=wbsRows(tasks,collapsed);
 const rows=[...tasks].sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id));
 const row=(id:string,index:number,handle?:React.ReactNode)=>{const task=rows.find(t=>t.id===id);if(!task)return null;const info=hierarchy.find(r=>r.task.id===id);if(!info)return null;return <div className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-border py-3 text-[length:var(--filter-fs)]">{handle??<span/>}<CdeNumber subcategory screen="components/projects/phase-tasks.tsx">{`${phaseIndex+1}.${info.number}`}</CdeNumber><div className="min-w-0"><p>{"› ".repeat(info.depth)}{task.work_package?"▣ ":""}{task.name}{info.hasChildren?<Button variant="ghost" size="compactIcon" aria-label={`Expandir ou recolher ${task.name}`} onClick={()=>setCollapsed(old=>{const next=new Set(old);if(next.has(id))next.delete(id);else next.add(id);return next;})}>{collapsed.has(id)?<ChevronRight/>:<ChevronDown/>}</Button>:null}</p><p className="text-muted-foreground">{nameOf(task.responsible_id)} · {displayDate(task.start)} — {displayDate(task.end)}</p></div>{!closed?<Button variant="ghost" size="compactIcon" title="Editar tarefa" aria-label={`Editar tarefa ${task.name}`} onClick={()=>onEdit(id)}><Pencil/></Button>:<span/>}</div>;};
 return <div>{!closed?<div className="flex justify-end"><CdeButton group="plus" screen="components/projects/phase-tasks.tsx" title="Adicionar tarefa à fase" aria-label="Adicionar tarefa à fase" onClick={onAdd}/></div>:null}{closed?rows.map((t,i)=>row(t.id,i)):<CdeSortableList ids={rows.map(t=>t.id)} labelOf={id=>rows.find(t=>t.id===id)?.name??"Tarefa"} onMove={onReorder}>{row}</CdeSortableList>}</div>;
}