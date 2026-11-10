import { describe, expect, it } from 'vitest';
import { legalSignaturePendingItems } from './legal-pending';
const user = { id: 'leonardo', full_name: 'Leonardo Roedel' };
const record = (participants: unknown[], category = 'minutes') => ({ id: 'ata', title: 'Ata', category, created_by: 'autor', content: { participants } });
describe('assinaturas pessoais pendentes', () => {
  it('inclui a ata que aguarda Leonardo sem duplicar participantes', () => {
    expect(legalSignaturePendingItems([record([{ name: user.full_name, userId: user.id }, { name: user.full_name, userId: user.id }])], user).map(item => item.recordId)).toEqual(['ata']);
  });
  it('não atribui a Leonardo a assinatura de outro participante', () => {
    expect(legalSignaturePendingItems([record([{ name: user.full_name, userId: 'outro' }])], user)).toEqual([]);
  });
  it('retira assinaturas concluídas e não inclui contratos', () => {
    expect(legalSignaturePendingItems([record([{ name: user.full_name, signature: 'imagem', signedAt: '2026-11-09' }]), record([{ name: user.full_name }], 'contracts')], user)).toEqual([]);
  });
  it('reconhece participantes antigos pelo nome e assinatura sem data continua pendente', () => {
    expect(legalSignaturePendingItems([record([{ name: ' Leonardo Roedel ', signature: 'imagem' }])], user)).toHaveLength(1);
  });
  it('soma as ações em aberto do usuário, ignorando concluídas, arquivadas e de outros', () => {
    const r = { id: 'ata', title: 'Ata', category: 'minutes', created_by: 'autor', content: { participants: [], subjects: [{ id: 's1', title: 'A' }] } };
    const a = (o: object) => ({ record_id: 'ata', subject_id: 's1', responsible_id: 'leonardo', completed_at: null, archived: false, ...o });
    const items = legalSignaturePendingItems([r], user, [a({}), a({}), a({ completed_at: '2026-11-09' }), a({ archived: true }), a({ responsible_id: 'outro' })]);
    expect(items.map(i => i.count)).toEqual([2]);
  });
});

import { legalPendingLabel as label2 } from './legal-pending';
import { describe as d2, it as i2, expect as e2 } from 'vitest';
d2('rótulo de reassinatura', () => {
  i2('indica edição da ata anterior', () => {
    e2(label2({ signature: true, actions: 0, title: 'Ata X', revision: 2 })).toBe('Nova assinatura pendente: edição 2 da ata anteriormente assinada · Ata X');
    e2(label2({ signature: true, actions: 0, title: 'Ata X' })).toBe('Assinatura da ata pendente · Ata X');
  });
});
