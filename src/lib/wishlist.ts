import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export type WishlistIdea = Database["public"]["Tables"]["wishlist_ideas"]["Row"];
export type WishlistMessage = Database["public"]["Tables"]["wishlist_messages"]["Row"];
export type WishlistStep = Database["public"]["Tables"]["wishlist_roadmap_steps"]["Row"];
export const WISHLIST_STATUSES = { ideia: "Ideia", em_analise: "Em análise", planejada: "Planejada", pronta_projeto: "Pronta para projeto", arquivada: "Arquivada" } as const;
export const wishlistIdeaSchema = z.object({
  title: z.string().trim().min(3, "Informe o título do desejo.").max(160),
  description: z.string().trim().min(10, "Descreva a ideia com pelo menos 10 caracteres.").max(6000),
  expected_result: z.string().trim().max(3000),
  status: z.enum(["ideia", "em_analise", "planejada", "pronta_projeto", "arquivada"]),
});
export const wishlistStepSchema = z.object({
  title: z.string().trim().min(3, "Informe o título da etapa.").max(200),
  description: z.string().trim().max(3000),
  responsible_id: z.string().uuid().nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  position: z.number().int().nonnegative(),
});
export const wishlistMessageSchema = z.object({
  idea_id: z.string().uuid(),
  message_type: z.enum(["question", "answer", "contribution"]),
  message: z.string().trim().min(1, "Digite a mensagem.").max(6000),
  recipient_id: z.string().uuid().nullable(),
  parent_message_id: z.string().uuid().nullable(),
});
export function wishlistSummary(description: string, length = 150) {
  const compact = description.replace(/\s+/g, " ").trim();
  return compact.length > length ? `${compact.slice(0, length - 1).trimEnd()}…` : compact;
}
export function unansweredWishlistQuestions(messages: WishlistMessage[]) {
  const answered = new Set(messages.filter(m => m.message_type === "answer").map(m => m.parent_message_id));
  return messages.filter(m => m.message_type === "question" && !answered.has(m.id));
}
export function canAnswerWishlistQuestion(question: WishlistMessage, userId: string, messages: WishlistMessage[]) {
  return question.message_type === "question" && question.recipient_id === userId && question.author_id !== userId && unansweredWishlistQuestions(messages).some(q => q.id === question.id);
}
export function canEditWishlistIdea(idea: Pick<WishlistIdea, "idealizer_id">, userId: string, erpAdmin: boolean) {
  return idea.idealizer_id === userId || erpAdmin;
}
export function wishlistHistoryText(text: string, nameFor: (id: string) => string) {
  const labels: Record<string, string> = { titulo: "Título", title: "Etapa", descricao: "Descrição", description: "Descrição", resultado: "Resultado esperado", situacao: "Situação", due_date: "Prazo", responsible_id: "Responsável", completed: "Concluída", position: "Ordem" };
  return text.split("\n").map(line => {
    const match = /^(Antes|Depois): (\{.*\})$/.exec(line);
    if (!match) return line === "Roadmap alterado" ? "Observação: Roadmap alterado" : line;
    try {
      const data: Record<string, unknown> = JSON.parse(match[2]);
      const fields = Object.entries(data).filter(([key]) => labels[key]).map(([key, value]) => {
        const display = key === "completed" ? value ? "Sim" : "Não" : key === "responsible_id" && typeof value === "string" ? nameFor(value) : key === "due_date" && typeof value === "string" ? value.split("-").reverse().join("/") : key === "situacao" && typeof value === "string" ? WISHLIST_STATUSES[value as keyof typeof WISHLIST_STATUSES] ?? value : key === "position" && typeof value === "number" ? String(value + 1) : String(value ?? "Não informado");
        return `${labels[key]}: ${display}`;
      });
      return `${match[1]}:\n${fields.join("\n")}`;
    } catch { return line; }
  }).join("\n");
}
export function wishlistProjectExport(idea: WishlistIdea, steps: WishlistStep[], messages: WishlistMessage[], idealizerName: string) {
  return {
    version: 1, source: "wishlist", destination: "myio Projects", wishlist_id: idea.id,
    title: idea.title, description: idea.description, expected_result: idea.expected_result,
    idealizer: { id: idea.idealizer_id, name: idealizerName }, created_at: idea.created_at,
    roadmap: steps.filter(s => s.idea_id === idea.id && !s.deleted_at).sort((a, b) => a.position - b.position).map(s => ({ id: s.id, title: s.title, description: s.description, responsible_id: s.responsible_id, due_date: s.due_date, completed: s.completed, completed_at: s.completed_at })),
    conversation: messages.filter(m => m.idea_id === idea.id),
  };
}