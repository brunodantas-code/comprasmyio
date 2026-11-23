import { describe, expect, it } from 'vitest';
import { availableReimbursements, reimbursementTotal } from './reimbursement';

describe('consolidação de reembolsos Spend', () => {
  const receipt = { holder_id: 'holder', status: 'pending', payment_source: 'reimbursement', reimbursement_order_id: null };
  it('consolida os reembolsos Cittá América e Rede Park pelo total de R$ 64,48', () => {
    expect(reimbursementTotal([{ amount: 29.48 }, { amount: 35 }])).toBe(64.48);
  });
  it('exclui cartão myio da solicitação de reembolso', () => {
    expect(availableReimbursements([{ ...receipt, payment_source: 'myio_card' }, receipt], 'holder')).toEqual([receipt]);
  });
  it('exige identificação explícita de reembolso, sem tratar pagamento desconhecido como reembolso', () => {
    expect(availableReimbursements([{ ...receipt, payment_source: '' }, { ...receipt, payment_source: 'unknown' }, receipt], 'holder')).toEqual([receipt]);
  });
  it('não solicita novamente comprovante já encaminhado ao Supply', () => {
    expect(availableReimbursements([{ ...receipt, reimbursement_order_id: 'order' }], 'holder')).toEqual([]);
  });
  it('inclui somente comprovantes do portador logado', () => {
    expect(availableReimbursements([receipt, { ...receipt, holder_id: 'other' }], 'holder')).toEqual([receipt]);
  });
});