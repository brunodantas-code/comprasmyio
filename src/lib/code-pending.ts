import { canReplyToCodeQuestion } from './code-conversation';

export type PendingCodeTicket = { id: string; ticket_number: number; title: string; reporter_id: string; status: string; created_at: string };
export type PendingCodeMessage = { id: string; ticket_id: string; author_id: string; message_type: string; parent_message_id: string | null };
export type CodePendingItem = { ticketId: string; ticketNumber: number; title: string; reporterId: string; createdAt: string; reporterName?: string; reason: 'responder' | 'aceitar' | 'atender' };

export function unansweredCodeQuestions(messages: PendingCodeMessage[]) {
  const answered = new Set(messages.filter(m => m.message_type === 'answer' && m.parent_message_id).map(m => `${m.ticket_id}:${m.parent_message_id}`));
  return messages.filter(m => m.message_type === 'question' && !answered.has(`${m.ticket_id}:${m.id}`));
}

export function codeQuestionResponders(ticketId: string, reporterId: string, messages: PendingCodeMessage[]) {
  const questions = unansweredCodeQuestions(messages).filter(message => message.ticket_id === ticketId);
  return {
    requester: questions.some(message => message.author_id !== reporterId),
    attendant: questions.some(message => message.author_id === reporterId),
  };
}

export function codePendingItems(tickets: PendingCodeTicket[], messages: PendingCodeMessage[], userId: string, isCodeAdmin: boolean): CodePendingItem[] {
  const unanswered = unansweredCodeQuestions(messages);
  return tickets.flatMap(ticket => {
    if (['concluido', 'excluido'].includes(ticket.status)) return [];
    const isReporter = ticket.reporter_id === userId;
    const questions = unanswered.filter(m => m.ticket_id === ticket.id && m.author_id !== userId);
    const reason = canReplyToCodeQuestion(ticket.status, isCodeAdmin, isReporter, questions.length)
      ? 'responder' : ticket.status === 'atendido' && isReporter ? 'aceitar'
      : isCodeAdmin && ['aberto', 'em_atendimento'].includes(ticket.status) ? 'atender' : null;
    return reason ? [{ ticketId: ticket.id, ticketNumber: ticket.ticket_number, title: ticket.title, reporterId: ticket.reporter_id, createdAt: ticket.created_at, reason }] : [];
  });
}