import { describe, expect, it } from 'vitest';
import { codePendingItems, codeQuestionResponders, unansweredCodeQuestions, type PendingCodeTicket, type PendingCodeMessage } from './code-pending';
const ticket: PendingCodeTicket = { id: 'ticket8', ticket_number: 8, title: 'Cidades', reporter_id: 'alexandre', status: 'atendido', created_at: '2026-10-28' };
const question: PendingCodeMessage = { id: 'question1', ticket_id: 'ticket8', author_id: 'alexandre', message_type: 'question', parent_message_id: null };
describe('Perguntas nas pendências do Code', () => {
  it('pergunta do Solicitante aguarda Atendente', () => {
    expect(codeQuestionResponders('ticket8', 'alexandre', [question])).toEqual({ requester: false, attendant: true });
  });
  it('pergunta do Atendente aguarda Solicitante', () => {
    expect(codeQuestionResponders('ticket8', 'alexandre', [{ ...question, author_id: 'leonardo' }])).toEqual({ requester: true, attendant: false });
  });
  it('identifica simultaneamente as duas partes sem incluir perguntas respondidas', () => {
    const other = { ...question, id: 'q2', author_id: 'leonardo' };
    expect(codeQuestionResponders('ticket8', 'alexandre', [question, other])).toEqual({ requester: true, attendant: true });
    expect(codeQuestionResponders('ticket8', 'alexandre', [question, other, { ...question, id: 'a2', message_type: 'answer', parent_message_id: 'q2' }])).toEqual({ requester: false, attendant: true });
  });
  it('identifica pergunta sem resposta na lista independente de quem a escreveu', () => {
    expect(unansweredCodeQuestions([question]).map(q => q.ticket_id)).toEqual(['ticket8']);
  });
  it('retira o indicador somente com resposta vinculada ao mesmo chamado e pergunta', () => {
    const answer = { ...question, id: 'a1', message_type: 'answer', parent_message_id: question.id };
    expect(unansweredCodeQuestions([question, answer])).toEqual([]);
    expect(unansweredCodeQuestions([question, { ...answer, ticket_id: 'other' }])).toEqual([question]);
  });
  it('mostra a pergunta do Alexandre no chamado 8 atendido para o atendente', () => {
    expect(codePendingItems([ticket], [question], 'leonardo', true)).toEqual([expect.objectContaining({ ticketNumber: 8, reason: 'responder' })]);
  });
  it('mostra pergunta do atendente para o solicitante', () => {
    expect(codePendingItems([ticket], [{ ...question, author_id: 'leonardo' }], 'alexandre', false)[0]?.reason).toBe('responder');
  });
  it('não cria pendência de resposta para o autor ou usuário não envolvido', () => {
    expect(codePendingItems([{ ...ticket, status: 'em_atendimento' }], [question], 'alexandre', false)).toEqual([]);
    expect(codePendingItems([ticket], [question], 'outro', false)).toEqual([]);
  });
  it('remove pergunta respondida sem remover atendimento em andamento', () => {
    const answer = { ...question, id: 'answer1', author_id: 'leonardo', message_type: 'answer', parent_message_id: question.id };
    expect(codePendingItems([ticket], [question, answer], 'leonardo', true)).toEqual([]);
    expect(codePendingItems([{ ...ticket, status: 'em_atendimento' }], [question, answer], 'leonardo', true)[0]?.reason).toBe('atender');
  });
  it('prioriza resposta e conta cada chamado uma única vez', () => {
    const rows = codePendingItems([{ ...ticket, status: 'em_atendimento' }], [question, { ...question, id: 'question2' }], 'leonardo', true);
    expect(rows).toHaveLength(1); expect(rows[0].reason).toBe('responder');
  });
  it('não inclui perguntas de chamados concluídos ou excluídos', () => {
    for (const status of ['concluido', 'excluido']) expect(codePendingItems([{ ...ticket, status }], [question], 'leonardo', true)).toEqual([]);
  });
});