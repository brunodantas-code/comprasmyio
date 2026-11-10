import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
export type PersonalTodo = Database["public"]["Tables"]["personal_todos"]["Row"];
export type TodoMessage = Database["public"]["Tables"]["personal_todo_messages"]["Row"];
export const todoSchema = z.object({
  title: z.string().trim().min(3).max(120), description: z.string().trim().min(10).max(4000),
  task_type: z.enum(["tarefa", "melhoria", "bug"]), priority: z.enum(["baixa", "media", "alta", "critica"]),
  urgency: z.enum(["normal", "urgente"]), expected_result: z.string().max(2000), proposed_solution: z.string().max(4000),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), shared_user_ids: z.array(z.string().uuid()),
});
export const TODO_STATUSES: Record<string, string> = { aberto: "Em aberto", em_atendimento: "Em execução", aguardando_resposta: "Aguardando resposta", atendido: "Executado", concluido: "Concluído", excluido: "Excluído" };
export function unansweredTodoQuestions(messages: TodoMessage[]) {
  const answered = new Set(messages.filter(m => m.message_type === "answer").map(m => m.parent_message_id));
  return messages.filter(m => m.message_type === "question" && !answered.has(m.id));
}
export function todoPendingItems(tasks: PersonalTodo[], messages: TodoMessage[], userId: string) {
  const pending = unansweredTodoQuestions(messages);
  return tasks.filter(t => !["concluido", "excluido"].includes(t.status) && (t.owner_id === userId || t.shared_user_ids.includes(userId)))
    .map(t => ({ task: t, questions: pending.filter(q => q.todo_id === t.id && q.recipient_id === userId).length, count: 1 }));
}