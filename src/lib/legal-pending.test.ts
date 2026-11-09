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
});