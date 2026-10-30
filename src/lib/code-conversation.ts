// Reply access is independent of permission to start an admin question.
export function canReplyToCodeQuestion(status: string | undefined, isAdmin: boolean, isReporter: boolean, pendingCount: number) {
  return Boolean(status && !["concluido", "excluido"].includes(status) && (isAdmin || isReporter) && pendingCount > 0);
}

export function shouldShowCodeAnswer(canReply: boolean, mode: "answer" | "question", canStartQuestion: boolean) {
  return canReply && (mode === "answer" || !canStartQuestion);
}

export function canConcludeCodeTicket(status: string | undefined, isReporter: boolean) {
  return status === "atendido" && isReporter;
}