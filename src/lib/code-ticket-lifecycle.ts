import { z } from "zod";
import { canConcludeCodeTicket } from "./code-conversation";

type ReopenableTicket = { status: string; reporter_id: string; assignee_id: string | null };

export function canReopenCodeTicket(ticket: ReopenableTicket | null, userId: string | undefined, isCodeAdmin: boolean) {
  return Boolean(ticket && userId && ticket.status === "concluido"
    && (ticket.reporter_id === userId || (isCodeAdmin && ticket.assignee_id === userId)));
}

export const codeReopenReasonSchema = z.string().trim()
  .min(1, "Informe o motivo da reabertura.")
  .max(2000, "O motivo deve ter no máximo 2000 caracteres.");

export function codeTicketProgressOutcome(requestedStatus: string, saved: { id: string; status: string } | null) {
  if (!saved) throw new Error("Não foi possível confirmar o salvamento do chamado. Atualize e tente novamente.");
  if (saved.status === requestedStatus) return "updated" as const;
  if (requestedStatus === "atendido" && saved.status === "em_atendimento") return "pending_requester_question" as const;
  throw new Error("A situação do chamado foi alterada. Atualize antes de salvar novamente.");
}

export function assertCodeProgressDraftSent(message: string) {
  if (message.trim()) throw new Error("Há uma pergunta ou resposta ainda não enviada. Envie pelo avião de papel antes de salvar o andamento.");
}

export function reconcileCodeProgressField<T extends string>(draft: T, previousSaved: T, saved: T): T {
  return draft === previousSaved ? saved : draft;
}

export function replaceSavedCodeTicket<T extends { id: string }>(tickets: readonly T[], saved: T): T[] {
  return tickets.map((ticket) => ticket.id === saved.id ? saved : ticket);
}

// A rejected or dismissed confirmation must never execute the conclusion.
export async function confirmCodeTicketConclusion(
  status: string,
  isReporter: boolean,
  confirm: () => Promise<boolean>,
  conclude: () => Promise<unknown>,
) {
  if (!canConcludeCodeTicket(status, isReporter) || !await confirm()) return false;
  await conclude();
  return true;
}