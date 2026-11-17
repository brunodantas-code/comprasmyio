import { DndContext, PointerSensor, KeyboardSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CdeDisclosureIcon } from "@/components/cde/cde-button";
import { TaskPriorityBadge, TaskStatusBadge } from "./task-controls";
import { taskId, type Task, type OpdeskData, type TaskStatus } from "./task-model";

const COLUMNS:TaskStatus[]=["Pendente","Em Execução","Em Revisão","Concluída"];
function BoardCard({task,data,expanded,onOpen}:{task:Task;data:OpdeskData;expanded:boolean;onOpen:(task:Task)=>void}) {
  const {attributes,listeners,setNodeRef,transform,isDragging}=useDraggable({id:task.id});
  const observation=data.observations.find(o=>o.task_id===task.id);
  return <article ref={setNodeRef} style={transform ? {transform:`translate(${transform.x}px, ${transform.y}px)`} : undefined} className={`relative min-w-0 rounded-md border border-border bg-card p-3 ${isDragging?"z-30 opacity-60":""}`}>
    <div className="flex items-start gap-2"><Button variant="ghost" size="compactIcon" className="touch-none shrink-0 cursor-grab" aria-label={`Mover ${taskId(task,data.tasks)}`} {...attributes} {...listeners}><GripVertical /></Button>
      <Tooltip><TooltipTrigger asChild><Button variant="ghost" className="h-auto min-w-0 flex-1 whitespace-normal p-0 text-left font-medium" onClick={()=>onOpen(task)}>{taskId(task,data.tasks)} · {task.title}</Button></TooltipTrigger><TooltipContent className="max-w-xs whitespace-pre-wrap">{observation?.text ?? task.title}</TooltipContent></Tooltip>
    </div>
    <p className="mt-2 break-words text-xs text-muted-foreground">{data.clients.find(c=>c.id===task.client_id)?.name}</p>
    <div className="mt-2 flex flex-wrap gap-1"><TaskStatusBadge status={task.status}/><TaskPriorityBadge priority={task.priority}/></div>
    {expanded && <div className="mt-3 space-y-2 border-t border-border pt-2 text-xs"><p>{task.action_type === "Outros"?task.action_custom:task.action_type}</p><p className="text-muted-foreground">{task.responsible_ids.map(id=>data.users.find(u=>u.id===id)?.full_name).filter(Boolean).join(", ") || "Sem responsável"}</p>{observation && <p className="whitespace-pre-wrap break-words">{observation.text}</p>}</div>}
  </article>;
}
function BoardColumn({status,children,count}:{status:TaskStatus;children:React.ReactNode;count:number}) {
  const {setNodeRef,isOver}=useDroppable({id:status});
  return <section ref={setNodeRef} aria-label={status} className={`min-h-64 min-w-0 space-y-3 border-t-2 pt-3 ${isOver?"border-primary bg-accent":"border-border"}`}><h3 className="flex items-center justify-between gap-2 text-sm font-medium"><span>{status}</span><span className="text-xs text-muted-foreground">{count}</span></h3>{children}</section>;
}
export function TaskBoard({tasks,data,enabled,expanded,onExpanded,onOpen,onMove}:{tasks:Task[];data:OpdeskData;enabled:boolean;expanded:boolean;onExpanded:()=>void;onOpen:(task:Task)=>void;onMove:(task:Task,status:TaskStatus)=>void}) {
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:6}}),useSensor(KeyboardSensor));
  const end=(event:DragEndEvent)=>{const task=tasks.find(t=>t.id===event.active.id);const status=COLUMNS.find(s=>s===event.over?.id);if(task && status && status!==task.status)onMove(task,status);};
  return <div className="space-y-4"><div className="flex justify-end"><Button variant="ghost" size="sm" onClick={onExpanded} aria-expanded={expanded}>{expanded?"Recolher cards":"Exibir cards completos"}<CdeDisclosureIcon open={expanded} screen="components/opdesk/task-board.tsx"/></Button></div>
    {!enabled && <p className="text-sm text-muted-foreground">Nenhuma tarefa prioritária selecionada.</p>}
    <DndContext sensors={sensors} onDragEnd={end}><div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">{COLUMNS.map(status=>{const rows=enabled?tasks.filter(t=>!t.parent_task_id && t.status===status):[];return <BoardColumn key={status} status={status} count={rows.length}>{rows.map(task=><BoardCard key={task.id} task={task} data={data} expanded={expanded} onOpen={onOpen}/>)}</BoardColumn>;})}</div></DndContext>
  </div>;
}