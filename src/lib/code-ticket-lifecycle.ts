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