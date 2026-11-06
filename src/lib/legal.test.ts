import { describe, it, expect } from 'vitest';
import { allParticipantsSigned, clearLegalSignatures, emptyLegalContent, legalSearchText, legalPendingCount, parseLegalContent, legalSubjectResponsibles } from './legal';
describe('Atas do Legal', () => {
  it('preserva responsável antigo e permite vários sem duplicar a ação pendente', () => {
    const subject = {id:'1',title:'Ação',description:'',decisions:'',responsible:'Bruno'};
    expect(legalSubjectResponsibles(subject)).toEqual(['Bruno']);
    const updated = {...subject,responsibles:['Bruno','João','Bruno']};
    expect(legalSubjectResponsibles(parseLegalContent({subjects:[updated]}).subjects[0])).toEqual(['Bruno','João']);
    expect(legalPendingCount({...emptyLegalContent(),subjects:[updated]}).actions).toBe(1);
    expect(legalSubjectResponsibles({...updated,responsibles:[]})).toEqual([]);
  });
  it('conta assinaturas pendentes e elimina a pendência após assinar', () => {
    const content = emptyLegalContent();
    content.participants = [{id:'1', name:'Ana', signature:'', signedAt:''}];
    expect(legalPendingCount(content).signatures).toBe(1);
    content.participants[0] = {...content.participants[0], signature:'PNG', signedAt:'2026-11-06'};
    expect(legalPendingCount(content).signatures).toBe(0);
  });
  it('ação com responsável fica pendente até registrar a data de conclusão', () => {
    const content = emptyLegalContent();
    content.subjects = [{id:'1', title:'Contratar', description:'', decisions:'', responsible:'Ana'}];
    expect(legalPendingCount(content).actions).toBe(1);
    content.subjects[0].completionDate = '2026-11-06';
    expect(legalPendingCount(content).actions).toBe(0);
  });
  it('responsável e conclusão são opcionais e preservados ao ler a ata', () => {
    const legacy = {id:'1', title:'Assunto', description:'Descrição', decisions:'Deliberação'};
    expect(legalPendingCount(parseLegalContent({subjects:[legacy]})).total).toBe(0);
    const subject = {...legacy, responsible:'Maria Externa', completionDate:'2026-11-06'};
    expect(parseLegalContent({subjects:[subject]}).subjects[0]).toEqual(subject);
  });
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