import { describe, it, expect } from 'vitest';
import { supplyPendingQuestions, type SupplyMessage } from './supply-conversation';
const order = { id: 'pedido', requester_id: 'solicitante', approval_number: '35', item_name: 'Material', status: 'pendente', request_type: 'materiais' };
const q: SupplyMessage = { id: 'pergunta', order_id: 'pedido', author_id: 'solicitante', recipient_id: null, message_type: 'question', parent_message_id: null, message: 'Alternativa?', created_at: '2026-11-05' };
describe('Pendências de conversa Supply', () => {
  it('pergunta do solicitante aparece para Compras e não para autor ou terceiros', () => {
    expect(supplyPendingQuestions([q], [order], 'comprador', true)[0]?.count).toBe(1);
    expect(supplyPendingQuestions([q], [order], 'solicitante', true)).toEqual([]);
    expect(supplyPendingQuestions([q], [order], 'outro', false)).toEqual([]);
  });
  it('pergunta de Compras aparece somente para o Solicitante', () => {
    const buyerQuestion = { ...q, author_id: 'comprador', recipient_id: 'solicitante' };
    expect(supplyPendingQuestions([buyerQuestion], [order], 'solicitante', false)[0]?.orderId).toBe('pedido');
    expect(supplyPendingQuestions([buyerQuestion], [order], 'outro-comprador', true)).toEqual([]);
  });
  it('resposta vinculada ao mesmo pedido retira a pendência', () => {
    const a = { ...q, id: 'resposta', author_id: 'comprador', message_type: 'answer', parent_message_id: 'pergunta' };
    expect(supplyPendingQuestions([q, a], [order], 'comprador', true)).toEqual([]);
    expect(supplyPendingQuestions([q, { ...a, order_id: 'outro' }], [order], 'comprador', true)[0]?.count).toBe(1);
  });
  it('cancelados e pagamentos não geram pendências de execução', () => {
    expect(supplyPendingQuestions([q], [{ ...order, status: 'cancelado' }], 'comprador', true)).toEqual([]);
    expect(supplyPendingQuestions([q], [{ ...order, request_type: 'pagamento' }], 'comprador', true)).toEqual([]);
  });
});