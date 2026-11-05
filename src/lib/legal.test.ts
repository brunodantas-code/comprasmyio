import { describe, it, expect } from 'vitest';
import { allParticipantsSigned, clearLegalSignatures, emptyLegalContent, legalSearchText } from './legal';
describe('Atas do Legal', () => {
  it('alterar o conteúdo exige novas assinaturas sem mudar os participantes', () => {
    const content = emptyLegalContent(); content.participants = [{id:'1',name:'Ana',signature:'PNG',signedAt:'2026-11-05'}];
    const updated = clearLegalSignatures(content);
    expect(updated.participants[0]).toEqual({id:'1',name:'Ana',signature:'',signedAt:''});
    expect(allParticipantsSigned(updated)).toBe(false);
  });
  it('exige assinatura de todos os participantes para PDF assinado', () => {
    const content = emptyLegalContent();
    content.participants = [{ id: '1', name: 'Ana', signature: 'data:image/png;base64,AA', signedAt: '2026-11-05' }, { id: '2', name: 'Bia', signature: '', signedAt: '' }];
    expect(allParticipantsSigned(content)).toBe(false);
    content.participants[1].signature = 'data:image/png;base64,AA'; content.participants[1].signedAt = '2026-11-05';
    expect(allParticipantsSigned(content)).toBe(true);
  });
  it('busca pelo assunto mesmo sem correspondência no título da ata', () => {
    const content = emptyLegalContent(); content.subjects = [{ id: '1', title: 'Aquisição', description: 'Fornecedores', decisions: '' }];
    expect(legalSearchText('Reunião semanal', content)).toContain('aquisicao');
    expect(legalSearchText('Reunião semanal', content)).not.toContain('financeiro');
  });
});