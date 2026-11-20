import { describe, expect, it } from 'vitest';
import { legalSignaturePendingItems, legalSubjectPendingCount } from './legal-pending';
import { parseLegalContent } from './legal';
const user = { id: 'leonardo', full_name: 'Leonardo Roedel' };
describe('totalizador pessoal do assunto', () => {
  const subject = parseLegalContent({ subjects: [{ id: 's', title: 'Assunto', responsibles: ['João Paulo Couto'] }] }).subjects[0];
  const joao = { id: 'joao', full_name: 'João Paulo Couto' };
  it('mostra responsabilidade sem ações somente para João, não para Leonardo', () => {
    expect(legalSubjectPendingCount('ata', subject, joao, [], [])).toBe(1);
    expect(legalSubjectPendingCount('ata', subject, user, [], [])).toBe(0);
  });
  it('conta as três ações do Leonardo e não as de João nem a responsabilidade do assunto com ações', () => {
    const action = { record_id: 'ata', subject_id: 's', responsible_id: 'leonardo', completed_at: null, archived: false, due_date: '2026-11-30' };
    const actions = [action, action, action, { ...action, responsible_id: 'joao' }];
    expect(legalSubjectPendingCount('ata', subject, user, actions, [])).toBe(3);
    expect(legalSubjectPendingCount('ata', subject, joao, actions, [])).toBe(1);
  });
  it('retira a responsabilidade concluída e ignora assinaturas pendentes de terceiros', () => {
    expect(legalSubjectPendingCount('ata', subject, joao, [], [{ record_id: 'ata', subject_id: 's' }])).toBe(0);
    const content = parseLegalContent({ participants: [{ name: 'Outro', userId: 'outro' }], subjects: [{ id: 's', title: 'Sem responsável' }] });
    expect(legalSubjectPendingCount('ata', content.subjects[0], user, [], [])).toBe(0);
  });
});
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
  it('participante sem cadastro no ERP não gera pendência de assinatura, mesmo com nome igual', () => {
    expect(legalSignaturePendingItems([record([{ name: ' Leonardo Roedel ', signature: 'imagem' }])], user)).toHaveLength(0);
  });
  it('soma as ações em aberto do usuário, ignorando concluídas, arquivadas e de outros', () => {
    const r = { id: 'ata', title: 'Ata', category: 'minutes', created_by: 'autor', content: { participants: [], subjects: [{ id: 's1', title: 'A' }] } };
    const a = (o: object) => ({ record_id: 'ata', subject_id: 's1', responsible_id: 'leonardo', completed_at: null, archived: false, due_date: '2026-11-30', ...o });
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

import { legalSignaturePendingItems as items3 } from './legal-pending';
describe('datas previstas das ações da ata', () => {
  const rec = { id: 'ata', title: 'Ata', category: 'minutes', created_by: user.id, content: { subjects: [{ id: 's', title: 'Assunto' }] } };
  const action = { record_id: 'ata', subject_id: 's', responsible_id: user.id, archived: false, completed_at: null, due_date: null as string | null };
  it('não atribui ao criador da ata as datas ausentes de João Paulo', () => {
    expect(items3([rec], user, [], [], [{ ...action, responsible_id: 'joao' }, { ...action, responsible_id: 'joao' }])).toEqual([]);
    expect(items3([rec], { id: 'joao', full_name: 'João' }, [], [], [{ ...action, responsible_id: 'joao' }, { ...action, responsible_id: 'joao' }])[0]?.count).toBe(2);
  });
  it('retira a pendência quando a data prevista é preenchida', () => {
    expect(items3([rec], user, [], [], [action])[0]?.count).toBe(1);
    expect(items3([rec], user, [], [], [{ ...action, due_date: '2026-11-30' }])).toEqual([]);
  });
  it('exige data prevista também nas ações concluídas, sem usar a data real como prazo', () => {
    expect(items3([rec], user, [], [], [{ ...action, completed_at: '2026-11-20' }])[0]?.missingDeadlines).toBe(1);
  });
  it('não conta ações arquivadas, assuntos removidos nem outras atas', () => {
    expect(items3([rec], user, [], [], [{ ...action, archived: true }, { ...action, subject_id: 'removido' }, { ...action, record_id: 'outra' }])).toEqual([]);
  });
});
d2('deliberação com responsável', () => {
  const rec = { id: 'r', title: 'Ata', category: 'minutes', created_by: 'x', content: { participants: [], subjects: [{ id: 's', title: 'A', description: '', decisions: 'Fazer', responsibles: ['Ana'] }] } };
  i2('é pendência sem ações até ser concluída', () => {
    e2(items3([rec], { id: 'u', full_name: 'Ana' })[0]?.count).toBe(1);
    e2(items3([rec], { id: 'u', full_name: 'Ana' }, [], [{ record_id: 'r', subject_id: 's' }])).toHaveLength(0);
  });
});

import { legalSubjectPendingBreakdown } from './legal-pending';
describe('datas previstas no totalizador do assunto', () => {
  const subject = parseLegalContent({ subjects: [{ id: 's', title: 'Assunto' }] }).subjects[0];
  const joao = { id: 'joao', full_name: 'João Paulo Couto' };
  const action = (o: object = {}) => ({ record_id: 'ata', subject_id: 's', responsible_id: 'joao', completed_at: null, archived: false, due_date: null as string | null, ...o });
  it('soma as ações sem data de conclusão às demais pendências do assunto', () => {
    expect(legalSubjectPendingCount('ata', subject, user, [action(), action()], [], user.id)).toBe(0);
    expect(legalSubjectPendingCount('ata', subject, user, [action({ responsible_id: 'leonardo' })], [], user.id)).toBe(2);
  });
  it('atribui datas ausentes ao responsável mesmo sem ser criador', () => {
    expect(legalSubjectPendingCount('ata', subject, joao, [action({ responsible_id: 'ana' })], [], user.id)).toBe(0);
    expect(legalSubjectPendingCount('ata', subject, user, [action({ responsible_id: user.id, completed_at: '2026-11-20' })], [], 'outro')).toBe(1);
  });
  it('informa quantas datas de conclusão faltam', () => {
    expect(legalSubjectPendingBreakdown('ata', subject, user, [action({ responsible_id: user.id, completed_at: '2026-11-20' }), action({ due_date: '2026-11-30' })], [], user.id)).toEqual({ count: 1, missingDeadlines: 1 });
  });
  it('o totalizador do assunto bate com o totalizador da ata', () => {
    const actions = [action({ responsible_id: 'leonardo' }), action({ responsible_id: 'leonardo', due_date: '2026-11-30' }), action()];
    const rec = { id: 'ata', title: 'Ata', category: 'minutes', created_by: user.id, content: { subjects: [{ id: 's', title: 'Assunto' }] } };
    expect(legalSubjectPendingCount('ata', subject, user, actions, [], user.id)).toBe(legalSignaturePendingItems([rec], user, actions, [], actions)[0]?.count);
  });
});

import { legalActionMissingDeadlineForUser } from './legal-pending';
describe('pendências pessoais nas capturas de Leonardo', () => {
  const subject = parseLegalContent({ subjects: [{ id: 's', title: 'Assunto' }] }).subjects[0];
  const done = { record_id: 'ata', subject_id: 's', responsible_id: 'joao', completed_at: '2026-11-09', archived: false, due_date: null };
  it('rescisão: somente uma data de Leonardo, não as duas datas de responsáveis distintos', () => {
    expect(legalSubjectPendingCount('ata', subject, user, [done, { ...done, responsible_id: user.id }], [], user.id)).toBe(1);
  });
  it('sem trabalho próprio: zero mesmo com duas datas ausentes de João', () => {
    expect(legalSubjectPendingCount('ata', subject, user, [done, done], [], user.id)).toBe(0);
  });
  it('manutenção: a data de João não se soma à única ação aberta de Leonardo', () => {
    expect(legalSubjectPendingCount('ata', subject, user, [done, { ...done, responsible_id: user.id, completed_at: null, due_date: '2026-12-04' }], [], user.id)).toBe(1);
  });
  it('bolinha individual segue o responsável e some após informar data', () => {
    expect(legalActionMissingDeadlineForUser(done, user.id)).toBe(false);
    expect(legalActionMissingDeadlineForUser(done, 'joao')).toBe(true);
    expect(legalActionMissingDeadlineForUser({ ...done, due_date: '2026-11-30' }, 'joao')).toBe(false);
  });
});
