import { z } from "zod";

export const TASK_STATUSES = ["Aguardando", "Pendente", "Em Execução", "Em Revisão", "Concluída", "Fechado"] as const;
export const TASK_PRIORITIES = ["Baixa", "Média", "Alta", "Urgente"] as const;
export const TASK_ACTIONS = ["Manutenção", "Instalação", "Substituição", "Revisão", "Realocação", "Software", "Painel", "App", "Retirada de Sensor/SW", "Análise de Ponto", "Outros"] as const;
export const FLOW_RULES = ["Nenhuma", "Opção 1", "Opção 2", "Opção 3", "Opção 4"] as const;
export const FLOW_LABELS = { Nenhuma: "Não influencia o fluxo da tarefa principal", "Opção 1": "Bloqueia qualquer avanço enquanto estiver Aguardando", "Opção 2": "Bloqueia a conclusão enquanto estiver Aguardando", "Opção 3": "Exige que a sub-tarefa esteja Concluída ou Fechado", "Opção 4": "Combina bloqueio de avanço e exigência de conclusão" };
export type TaskStatus = typeof TASK_STATUSES[number];
export type FlowRule = typeof FLOW_RULES[number];
export type TaskPriority = typeof TASK_PRIORITIES[number];
export type Agent = { name: string; status: "Executor responsável" | "Participante" };
export type Task = { id: string; task_number: number; client_id: string; title: string; action_type: typeof TASK_ACTIONS[number]; action_custom: string | null; start_date: string | null; end_date: string | null; priority: TaskPriority; status: TaskStatus; responsible_ids: string[]; agents: Agent[]; links: string[]; parent_task_id: string | null; subtask_number: number | null; flow_rule: FlowRule; created_by: string; completed_at: string | null; created_at: string; updated_at: string };
export type TaskClient = { id: string; name: string; created_by: string; created_at: string };
export type TaskUser = { id: string; full_name: string; email: string | null };
export type TaskLog = { id: string; task_id: string; text: string; actor_email: string; created_at: string };
export type TaskObservation = { id: string; task_id: string; text: string; author_email: string; created_at: string };
export type TaskAttachment = { id: string; task_id: string; uploaded_by: string; file_name: string; storage_path: string; content_type: string; file_size: number; created_at: string };
export type OpdeskData = { tasks: Task[]; clients: TaskClient[]; users: TaskUser[]; responsibleIds: string[]; registrations: { user_id: string; created_at: string }[]; observations: TaskObservation[]; userId: string };
const optionalDate = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).nullable();
export const taskValuesSchema = z.object({
  client_id: z.string().uuid(), title: z.string().trim().min(1,"Informe o título").max(240), action_type: z.enum(TASK_ACTIONS), action_custom: z.string().trim().max(500).nullable(), start_date: optionalDate, end_date: optionalDate,
  priority: z.enum(TASK_PRIORITIES), status: z.enum(TASK_STATUSES), responsible_ids: z.array(z.string().uuid()).max(50), agents: z.array(z.object({ name: z.string().trim().min(1).max(180), status: z.enum(["Executor responsável","Participante"]) })).max(50), links: z.array(z.string().max(2000).url().refine(v => /^https?:\/\//i.test(v),"Use um link http ou https")).max(30), parent_task_id: z.string().uuid().nullable(), flow_rule: z.enum(FLOW_RULES),
}).superRefine((v,ctx) => {
  if (v.action_type === "Outros" && !v.action_custom?.trim()) ctx.addIssue({ code:"custom", path:["action_custom"], message:"Descreva a ação Outros" });
  if (v.start_date && v.end_date && v.end_date < v.start_date) ctx.addIssue({ code:"custom", path:["end_date"], message:"Término anterior ao início" });
});
export type TaskValues = z.infer<typeof taskValuesSchema>;
export const valuesOf = (t: Task): TaskValues => ({client_id:t.client_id,title:t.title,action_type:t.action_type,action_custom:t.action_custom,start_date:t.start_date,end_date:t.end_date,priority:t.priority,status:t.status,responsible_ids:t.responsible_ids,agents:t.agents,links:t.links,parent_task_id:t.parent_task_id,flow_rule:t.flow_rule});
export function taskId(task: Pick<Task,"task_number"|"parent_task_id"|"subtask_number">, tasks: readonly Task[]) {
  const parent = tasks.find(t => t.id === task.parent_task_id);
  return `T-${String(parent?.task_number ?? task.task_number).padStart(6,"0")}${parent ? `.${task.subtask_number}` : ""}`;
}
export function flowBlocks(rule: FlowRule, sub: TaskStatus, main: TaskStatus) {
  return (["Opção 1","Opção 4"].includes(rule) && sub === "Aguardando" && main !== "Aguardando") || (rule === "Opção 2" && sub === "Aguardando" && ["Concluída","Fechado"].includes(main)) || (["Opção 3","Opção 4"].includes(rule) && !["Concluída","Fechado"].includes(sub) && ["Concluída","Fechado"].includes(main));
}
export const localDay = () => new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Sao_Paulo"}).format(new Date());
export type DeadlineState = "Dentro do prazo" | "Atenção em revisão" | "Atrasada para finalização" | "Atrasada para execução";
export function taskDeadline(t: Pick<Task,"status"|"start_date"|"end_date">, today: string): DeadlineState {
  if (["Aguardando","Concluída","Fechado"].includes(t.status)) return "Dentro do prazo";
  if (t.end_date && t.end_date < today) {
    const days = (Date.parse(`${today}T12:00:00Z`) - Date.parse(`${t.end_date}T12:00:00Z`))/86400000;
    return t.status === "Em Revisão" && days <= 2 ? "Atenção em revisão" : "Atrasada para finalização";
  }
  return t.start_date && t.start_date < today && t.status === "Pendente" ? "Atrasada para execução" : "Dentro do prazo";
}
export function boardEnabled(deadline: string, priorities: readonly string[]) {
  return ["Atenção em revisão","Atrasada para finalização","Atrasada para execução"].includes(deadline) || priorities.some(p => ["Alta","Urgente"].includes(p));
}
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
export function taskMatches(t: Task, tasks: Task[], clients: TaskClient[], users: TaskUser[], query: string) {
  if (!query.trim()) return true;
  const parent = tasks.find(p=>p.id===t.parent_task_id);
  const number = String(parent?.task_number ?? t.task_number);
  const text = normalize([taskId(t,tasks),number,t.parent_task_id ? `${number}.${t.subtask_number}` : "",t.title,clients.find(c=>c.id===t.client_id)?.name,...t.responsible_ids.map(id=>users.find(u=>u.id===id)?.full_name),...t.agents.map(a=>a.name)].join(" "));
  return normalize(query.trim()).split(/\s+/).every(term=>text.includes(term));
}
export function csvText(rows: readonly (readonly unknown[])[]) {
  const safe = (value: unknown) => { let s = String(value ?? ""); if (/^[=+@-]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g,'""')}"`; };
  return `\uFEFF${rows.map(row=>row.map(safe).join(";")).join("\r\n")}`;
}
export function downloadCsv(name: string, rows: readonly (readonly unknown[])[]) {
  const url=URL.createObjectURL(new Blob([csvText(rows)],{type:"text/csv;charset=utf-8"})); const a=document.createElement("a"); a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export const brDate = (v: string | null) => v ? v.slice(0,10).split("-").reverse().map((p,i)=>i===2?p.slice(-2):p).join("/") : "—";
export const terminalTask = (status: TaskStatus) => status === "Concluída" || status === "Fechado";