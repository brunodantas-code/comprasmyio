export type WbsTask={id:string;parent_id?:string|null;position:number};
export function wbsRows<T extends WbsTask>(tasks:T[],collapsed:Set<string>=new Set()):{task:T;number:string;depth:number;hasChildren:boolean}[]{
 const ids=new Set(tasks.map(t=>t.id));const rows:{task:T;number:string;depth:number;hasChildren:boolean}[]=[];const visited=new Set<string>();
 const walk=(parent:string|null,prefix:string,depth:number)=>{const children=tasks.filter(t=>(t.parent_id&&ids.has(t.parent_id)?t.parent_id:null)===parent).sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id));children.forEach((task,i)=>{if(visited.has(task.id))return;visited.add(task.id);const number=prefix?`${prefix}.${i+1}`:String(i+1);const hasChildren=tasks.some(t=>t.parent_id===task.id);rows.push({task,number,depth,hasChildren});if(!collapsed.has(task.id))walk(task.id,number,depth+1);});};
 walk(null,"",0);return rows;
}