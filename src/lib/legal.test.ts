import { describe, it, expect } from 'vitest';
import { allParticipantsSigned, legalSigners, legalUserParticipated, clearLegalSignatures, emptyLegalContent, legalSearchText, legalPendingCount, parseLegalContent, legalSubjectResponsibles } from './legal';
describe('Atas do Legal', () => {
  it('reconhece participação pelo usuário cadastrado independentemente da assinatura', () => {
    const user = { id: 'leonardo', full_name: 'Leonardo Roedel' };
    const content = parseLegalContent({ participants: [{ userId: 'leonardo', name: 'Leonardo Roedel', signature: '', signedAt: '' }] });
    expect(legalUserParticipated(content, user)).toBe(true);
    expect(legalUserParticipated(content, { id: 'joao', full_name: 'João Paulo Couto' })).toBe(false);
    expect(legalUserParticipated(content, null)).toBe(false);
  });
  it('reconhece nomes legados sem vínculo, mas não confunde outro usuário com nome igual', () => {
    const user = { id: 'leonardo', full_name: 'Leonardo Roedel' };
    expect(legalUserParticipated(parseLegalContent({ participants: [{ name: ' LEONARDO  ROEDEL ' }] }), user)).toBe(true);
    expect(legalUserParticipated(parseLegalContent({ participants: [{ name: 'Leonardo Roedel', userId: 'outro' }] }), user)).toBe(false);
    expect(legalUserParticipated(parseLegalContent({ participants: [] }), user)).toBe(false);
  });
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
    content.participants = [{ id: '1', name: 'Ana', userId: 'ana', signature: 'data:image/png;base64,AA', signedAt: '2026-11-05' }, { id: '2', name: 'Bia', userId: 'bia', signature: '', signedAt: '' }, { id: '3', name: 'Luiza - Shopping (externa)', signature: '', signedAt: '' }];
    expect(allParticipantsSigned(content)).toBe(false);
    content.participants[1].signature = 'data:image/png;base64,AA'; content.participants[1].signedAt = '2026-11-05';
    expect(allParticipantsSigned(content)).toBe(true);
  });
  it('convidado sem cadastro no ERP não entra na lista de assinaturas', () => {
    const content = emptyLegalContent();
    content.participants = [{ id: '1', name: 'Ana', userId: 'ana', signature: '', signedAt: '' }, { id: '2', name: 'Alexandre - Shopping Taboão', signature: '', signedAt: '' }];
    expect(legalSigners(content).map(p => p.name)).toEqual(['Ana']);
  });
  it('busca pelo assunto mesmo sem correspondência no título da ata', () => {
    const content = emptyLegalContent(); content.subjects = [{ id: '1', title: 'Aquisição', description: 'Fornecedores', decisions: '' }];
    expect(legalSearchText('Reunião semanal', content)).toContain('aquisicao');
    expect(legalSearchText('Reunião semanal', content)).not.toContain('financeiro');
  });
});
import { mergeConfidentialSubjects, splitConfidentialSubjects, parseLegalContent as plc } from './legal';
import { describe as dc, it as ic, expect as ec } from 'vitest';
dc('assuntos confidenciais', () => {
  ic('saem do conteúdo compartilhado e voltam na mesma posição para Admin', () => {
    const c = { location: '', counterpart: '', participants: [], subjects: [{ id: 'a', title: 'A', description: '', decisions: '' }, { id: 'b', title: 'B', description: '', decisions: '', confidential: true }, { id: 'c', title: 'C', description: '', decisions: '' }] };
    const split = splitConfidentialSubjects(c);
    ec(split.content.subjects.map(s => s.id)).toEqual(['a', 'c']);
    const merged = plc(mergeConfidentialSubjects(split.content, 'r', split.confidential.map(x => ({ record_id: 'r', subject_id: x.subject.id, position: x.position, subject: x.subject }))));
    ec(merged.subjects.map(s => s.id)).toEqual(['a', 'b', 'c']);
  });
});
import { normalizeLegalTitle, normalizeLegalContentTitles } from './legal';
import { describe as dt, it as it2, expect as ex } from 'vitest';
dt('título sem Caps Lock', () => {
  it2('baixa o título digitado em CAIXA ALTA, mantendo o separador e a primeira letra depois dele', () => {
    ex(normalizeLegalTitle('REUNIÃO DE CHECK POINT - TECNOLOGIA 17/11/26')).toBe('Reunião de check point - Tecnologia 17/11/26');
  });
  it2('mantém exatamente o título já escrito em maiúsculas e minúsculas', () => {
    const typed = 'Govtech | Myio | Apsis: contrato, diligência e cronograma';
    ex(normalizeLegalTitle(typed)).toBe(typed);
  });
  it2('preserva siglas conhecidas ao baixar a caixa alta', () => {
    ex(normalizeLegalTitle('ALINHAMENTO ERP E CRM')).toBe('Alinhamento ERP e CRM');
    ex(normalizeLegalTitle('OKR')).toBe('OKR');
    ex(normalizeLegalTitle('CHECKIN DE OKR\'S')).toBe("Checkin de OKR'S");
  });
  it2('aplica o mesmo padrão ao título de cada assunto', () => {
    const c = { location: '', counterpart: '', participants: [], subjects: [{ id: '1', title: 'DEFINIÇÃO DE ESCOPO', description: '', decisions: '' }, { id: '2', title: 'Contrato de manutenção', description: '', decisions: '' }] };
    ex(normalizeLegalContentTitles(c).subjects.map(s => s.title)).toEqual(['Definição de escopo', 'Contrato de manutenção']);
  });
});
