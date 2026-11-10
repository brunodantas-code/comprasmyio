export type CriticalPending={key:string;title:string;app:string;due:string;route:'/legal'|'/dashboard'|'/mytosis'|'/pendentes';record:string;task?:string};
export function dueToday<T extends {due:string|null;completed?:boolean;canceled?:boolean}>(rows:readonly T[],today:string){return rows.filter(r=>r.due===today&&!r.completed&&!r.canceled);}
