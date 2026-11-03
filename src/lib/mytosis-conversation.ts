export type OkrMessage = { id: string; node_id: string; author_id: string; kind: string; reply_to_id: string | null };

export function pendingOkrQuestions(messages: OkrMessage[], nodeId: string, userId: string) {
  return messages.filter((question) => question.node_id === nodeId && question.kind === "question" && question.author_id !== userId && !messages.some((answer) => answer.node_id === nodeId && answer.kind === "answer" && answer.reply_to_id === question.id));
}