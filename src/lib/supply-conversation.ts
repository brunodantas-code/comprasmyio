export type SupplyMessage = { id: string; order_id: string; author_id: string; recipient_id: string | null; message_type: string; parent_message_id: string | null; message: string; created_at: string };
export function unansweredSupplyQuestions(messages: SupplyMessage[]) {
  const answered = new Set(messages.filter(m => m.message_type === 'answer').map(m => `${m.order_id}:${m.parent_message_id}`));
  return messages.filter(m => m.message_type === 'question' && !answered.has(`${m.order_id}:${m.id}`));
}
export function canAnswerSupplyQuestion(question: SupplyMessage, userId: string, isBuyer: boolean, requesterId: string) {
  return question.author_id !== userId && (question.recipient_id ? question.recipient_id === userId : isBuyer && requesterId !== userId);
}
export function supplyPendingQuestions(messages: SupplyMessage[], orders: { id: string; requester_id: string; approval_number: string | null; item_name: string; status: string; request_type: string }[], userId: string, isBuyer: boolean) {
  return orders.flatMap(o => {
    if (o.status === 'cancelado' || o.request_type === 'pagamento') return [];
    const questions = unansweredSupplyQuestions(messages).filter(q => q.order_id === o.id && canAnswerSupplyQuestion(q, userId, isBuyer, o.requester_id));
    return questions.length ? [{ orderId: o.id, approvalNumber: o.approval_number, title: o.item_name, requesterId: o.requester_id, count: questions.length }] : [];
  });
}