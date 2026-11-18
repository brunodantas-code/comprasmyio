import { addDays, parseISO } from "date-fns";
import { advance, dateKey, isWorking, schedule, type Allocation, type Calendar, type Dependency, type PlanTask, type ScheduledTask } from "./logic";
export type BoardColumn = {id:string;name:string;progress:number};
export type CustomField = {id:string;name:string;type:"text"|"number"|"date"};
export const defaultColumns:BoardColumn[]=[{id:"todo",name:"A fazer",progress:0},{id:"doing",name:"Em andamento",progress:50},{id:"done",name:"Concluído",progress:100}];
export function columnOf(task: {progress:number;board_column?:string|null}, columns:BoardColumn[]) {
 return columns.find(c=>c.id===task.board_column)?.id ?? [...columns].sort((a,b)=>Math.abs(a.progress-task.progress)-Math.abs(b.progress-task.progress))[0]?.id;
}
export type PersonResource={id:string;user_id:string|null;name:string;kind:string;capacity_per_day:number;unit?:string};
export function workload(tasks:ScheduledTask[],allocations:Allocation[],resources:PersonResource[],calendars:Map<string,Calendar>) {
 const rows=new Map<string,{person:string;name:string;date:string;load:number;capacity:number;taskIds:string[]}>();
 for(const a of allocations){const t=tasks.find(t=>t.id===a.task_id),r=resources.find(r=>r.id===a.resource_id),cal=t?calendars.get(t.project_id):undefined;
 if(!t||!r||!cal||r.kind!=="person"||t.milestone||t.progress===100||r.unit&&r.unit!=="h")continue;
 for(let d=t.start;d<=t.end;d=dateKey(addDays(parseISO(d),1))){if(!isWorking(d,cal))continue;const person=r.user_id??r.id,key=`${person}:${d}`,old=rows.get(key);
 rows.set(key,{person,name:r.name,date:d,load:(old?.load??0)+a.planned_quantity/Math.max(1,t.duration),capacity:Math.min(old?.capacity??r.capacity_per_day,r.capacity_per_day),taskIds:[...new Set([...(old?.taskIds??[]),t.id])]});}
 }return [...rows.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name));
}
export function effortByUnit(allocations:(Allocation & {resource_id:string})[],resources:{id:string;unit:string}[]) {
 return allocations.reduce<Record<string,{planned:number;actual:number}>>((out,a)=>{const unit=resources.find(r=>r.id===a.resource_id)?.unit??"Unidade não registrada";const row=out[unit]??{planned:0,actual:0};out[unit]={planned:row.planned+a.planned_quantity,actual:row.actual+a.actual_quantity};return out;},{});
}
export function levelingProposal(projectId:string,tasks:PlanTask[],deps:Dependency[],calendar:Calendar,otherTasks:ScheduledTask[],allocations:Allocation[],resources:PersonResource[],calendars:Map<string,Calendar>) {
 const proposed=tasks.map(t=>({...t}));const changes=new Map<string,{id:string;name:string;before:string;after:string}>();
 for(let attempt=0;attempt<366;attempt++){
 const current=schedule(proposed,deps,calendar);const overloaded=workload([...otherTasks,...current],allocations,resources,calendars).find(r=>r.load>r.capacity&&r.taskIds.some(id=>proposed.some(t=>t.id===id)));
 if(!overloaded)return {changes:[...changes.values()],resolved:true};
 const move=[...current].reverse().find(t=>overloaded.taskIds.includes(t.id)&&t.project_id===projectId&&!t.actual_start&&t.progress===0&&!t.work_package);
 if(!move)return {changes:[...changes.values()],resolved:false};
 const task=proposed.find(t=>t.id===move.id);if(!task)break;
 const after=advance(move.start,1,calendar);changes.set(task.id,{id:task.id,name:task.name,before:changes.get(task.id)?.before??task.start_date,after});task.start_date=after;
 }return {changes:[...changes.values()],resolved:false};
}