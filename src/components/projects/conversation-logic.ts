export type TaskMessage = {id:string;task_id:string;kind:string;author_id:string;recipient_id:string|null;reply_to_id:string|null;seen_at?:string|null};
export function taskPendingMessages<T extends TaskMessage>(rows:T[],taskId:string,userId:string) {
 const answers=new Set(rows.filter(m=>m.kind==="answer").map(m=>m.reply_to_id));
 return rows.filter(m=>m.task_id===taskId&&m.author_id!==userId&&m.recipient_id===userId&&((m.kind==="question"&&!answers.has(m.id))||(m.kind==="mention"&&!m.seen_at)));
}