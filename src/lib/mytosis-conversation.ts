export type ConversationMessage = { id: string; author_id: string; kind: string; reply_to_id: string | null; recipient_id?: string | null };
export type OkrMessage = ConversationMessage & { node_id: string };

export function pendingDirectedQuestions<T extends ConversationMessage>(messages: T[], userId: string) {
  return messages.filter((question) => question.kind === "question" && question.author_id !== userId && (!question.recipient_id || question.recipient_id === userId) && !messages.some((answer) => answer.kind === "answer" && answer.reply_to_id === question.id));
}

export function pendingOkrQuestions<T extends OkrMessage>(messages: T[], nodeId: string, userId: string) {
  return pendingDirectedQuestions(messages.filter((message) => message.node_id === nodeId), userId);
}