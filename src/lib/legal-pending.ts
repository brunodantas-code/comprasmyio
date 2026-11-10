import { legalSubjectResponsibles, parseLegalContent, type LegalSubject } from './legal';
import { canSignParticipant } from './signatures';

type PendingAction = { record_id: string; subject_id: string; responsible_id: string; completed_at: string | null; archived: boolean };

type SubjectCompletion = { record_id: string; subject_id: string };

/** Subject badges count only this user's work, never meeting signatures. */
export function legalSubjectPendingCount(recordId: string, subject: LegalSubject, user: { id: string; full_name: string } | null | undefined, actions: readonly PendingAction[], completions: readonly SubjectCompletion[]) {
  if (!user) return 0;
  const ownActions = actions.filter(a => a.record_id === recordId && a.subject_id === subject.id && a.responsible_id === user.id && !a.archived && !a.completed_at).length;
  const norm = (name: string) => name.trim().toLowerCase();
  const ownDeliberation = openDeliberations(recordId, [subject], actions, completions).some(s => legalSubjectResponsibles(s).some(name => norm(name) === norm(user.full_name)));
  return ownActions + (ownDeliberation ? 1 : 0);
}

/** Deliberations assigned to responsibles with no tracked actions stay pending until marked done. */
export function openDeliberations(recordId: string, subjects: readonly LegalSubject[], actions: readonly { record_id: string; subject_id: string; archived: boolean }[], completions: readonly SubjectCompletion[]) {
  return subjects.filter(s => legalSubjectResponsibles(s).length > 0 && !actions.some(a => a.record_id === recordId && a.subject_id === s.id && !a.archived) && !completions.some(c => c.record_id === recordId && c.subject_id === s.id));
}

/** Pending legal items per minutes record for one user: own unsigned signature plus own open actions in current subjects. */
export function legalSignaturePendingItems(records: readonly { id: string; title: string; category: string; content: unknown; created_by: string }[], user: { id: string; full_name: string }, actions: readonly PendingAction[] = [], completions: readonly SubjectCompletion[] = [], allActions: readonly { record_id: string; subject_id: string; archived: boolean }[] = actions) {
  return records.filter(record => record.category === 'minutes').map(record => {
    const content = parseLegalContent(record.content);
    const signature = content.participants.some(participant => canSignParticipant(participant, user) && (!participant.signature || !participant.signedAt));
    const subjectIds = new Set(content.subjects.map(s => s.id));
    const openActions = actions.filter(a => a.record_id === record.id && subjectIds.has(a.subject_id) && a.responsible_id === user.id && !a.archived && !a.completed_at).length;
    const norm = (v: string) => v.trim().toLowerCase();
    const deliberations = openDeliberations(record.id, content.subjects, allActions, completions).filter(s => legalSubjectResponsibles(s).some(n => norm(n) === norm(user.full_name))).length;
    return { recordId: record.id, title: record.title, requesterId: record.created_by, signature, revision: content.revision ?? 0, actions: openActions + deliberations, count: (signature ? 1 : 0) + openActions + deliberations };
  }).filter(item => item.count > 0);
}

export function legalPendingLabel(item: { signature: boolean; actions: number; title: string; revision?: number }) {
  const parts = [item.signature ? (item.revision ? `Nova assinatura pendente: edição ${item.revision} da ata anteriormente assinada` : 'Assinatura da ata pendente') : null, item.actions ? `${item.actions} ${item.actions === 1 ? 'ação pendente' : 'ações pendentes'}` : null].filter(Boolean);
  return `${parts.join(' e ')} · ${item.title}`;
}