import { describe, expect, it } from 'vitest';
import { canSignParticipant, signDocumentSchema, signatureDate, signatureImageSchema } from './signatures';

describe('assinaturas pessoais', () => {
  it('exige senha em cada assinatura', () => {
    const input = { recordId: '11111111-1111-4111-8111-111111111111', participantId: 'p1', expectedUpdatedAt: '2026-11-09T03:28:00Z', password: '' };
    expect(signDocumentSchema.safeParse(input).success).toBe(false);
    expect(signDocumentSchema.safeParse({ ...input, password: 'senha-confirmada' }).success).toBe(true);
  });
  it('cada usuário assina somente sua própria participação', () => {
    const user = { id: 'ana', full_name: 'Ana' };
    expect(canSignParticipant({ userId: 'ana', name: 'Ana' }, user)).toBe(true);
    expect(canSignParticipant({ userId: 'bia', name: 'Ana' }, user)).toBe(false);
    expect(canSignParticipant({ name: 'Bia' }, user)).toBe(false);
  });
  it('preserva reconhecimento de participantes antigos pelo nome', () => {
    expect(canSignParticipant({ name: 'Ana' }, { id: 'ana', full_name: 'Ana' })).toBe(true);
  });
  it('exibe data e hora da assinatura no horário brasileiro', () => {
    expect(signatureDate('2026-11-09T03:28:00Z')).toContain('09/11/2026');
    expect(signatureDate('2026-11-09T03:28:00Z')).toContain('00:28');
  });
  it('aceita apenas imagem PNG da assinatura', () => {
    expect(signatureImageSchema.safeParse('data:image/png;base64,iVBORw0KGgoAAA==').success).toBe(true);
    expect(signatureImageSchema.safeParse('javascript:alert(1)').success).toBe(false);
  });
});