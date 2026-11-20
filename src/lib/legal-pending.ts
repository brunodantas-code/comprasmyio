import { legalSubjectResponsibles, parseLegalContent, type LegalSubject } from './legal';
import { canSignParticipant } from './signatures';

type PendingAction = { record_id: string; subject_id: string; responsible_id: string; completed_at: string | null; archived: boolean; due_date?: string | null };

type SubjectCompletion = { record_id: string; subject_id: string };
type DeadlineAction = { record_id: string; subject_id: string; archived: boolean; due_date?: string | null; completed_at?: string | null };

/** Subject badges count only this user's work, never meeting signatures. Missing conclusion dates belong to the minutes creator. */
export function legalSubjectPendingBreakdown(recordId: string, subject: LegalSubject, user: { id: string; full_name: string } | null | undefined, actions: readonly PendingAction[], completions: readonly SubjectCompletion[], recordCreatedBy?: string | null) {
  if (!user) return { count: 0, missingDeadlines: 0 };
  const ownActions = actions.filter(a => a.record_id === recordId && a.subject_id === subject.id && a.responsible_id === user.id && !a.archived && !a.completed_at).length;
  const norm = (name: string) => name.trim().toLowerCase();
  const ownDeliberation = openDeliberations(recordId, [subject], actions, completions).some(s => legalSubjectResponsibles(s).some(name => norm(name) === norm(user.full_name)));
  const missingDeadlines = recordCreatedBy && recordCreatedBy === user.id ? actions.filter(a => a.record_id === recordId && a.subject_id === subject.id && !a.archived && !a.due_date?.trim()).length : 0;
  return { count: ownActions + (ownDeliberation ? 1 : 0) + missingDeadlines, missingDeadlines };
}

export function legalSubjectPendingCount(recordId: string, subject: LegalSubject, user: { id: string; full_name: string } | null | undefined, actions: readonly PendingAction[], completions: readonly SubjectCompletion[], recordCreatedBy?: string | null) {
  return legalSubjectPendingBreakdown(recordId, subject, user, actions, completions, recordCreatedBy).count;
}

/** Deliberations assigned to responsibles with no tracked actions stay pending until marked done. */
export function openDeliberations(recordId: string, subjects: readonly LegalSubject[], actions: readonly { record_id: string; subject_id: string; archived: boolean }[], completions: readonly SubjectCompletion[]) {
  return subjects.filter(s => legalSubjectResponsibles(s).length > 0 && !actions.some(a => a.record_id === recordId && a.subject_id === s.id && !a.archived) && !completions.some(c => c.record_id === recordId && c.subject_id === s.id));
}

/** Pending legal items per minutes record for one user: own unsigned signature plus own open actions in current subjects. */
export function legalSignaturePendingItems(records: readonly { id: string; title: string; category: string; content: unknown; created_by: string }[], user: { id: string; full_name: string }, actions: readonly PendingAction[] = [], completions: readonly SubjectCompletion[] = [], allActions: readonly DeadlineAction[] = actions) {
  return records.filter(record => record.category === 'minutes').map(record => {
    const content = parseLegalContent(record.content);
    const signature = content.participants.some(participant => canSignParticipant(participant, user) && (!participant.signature || !participant.signedAt));
    const subjectIds = new Set(content.subjects.map(s => s.id));
    const openActions = actions.filter(a => a.record_id === record.id && subjectIds.has(a.subject_id) && a.responsible_id === user.id && !a.archived && !a.completed_at).length;
    const norm = (v: string) => v.trim().toLowerCase();
    const deliberations = openDeliberations(record.id, content.subjects, allActions, completions).filter(s => legalSubjectResponsibles(s).some(n => norm(n) === norm(user.full_name))).length;
    const missingDeadlines = record.created_by === user.id ? allActions.filter(a => a.record_id === record.id && subjectIds.has(a.subject_id) && !a.archived && !a.due_date?.trim()).length : 0;
    return { recordId: record.id, title: record.title, requesterId: record.created_by, signature, revision: content.revision ?? 0, actions: openActions + deliberations, missingDeadlines, count: (signature ? 1 : 0) + openActions + deliberations + missingDeadlines };
  }).filter(item => item.count > 0);
}

export function legalPendingLabel(item: { signature: boolean; actions: number; title: string; revision?: number; missingDeadlines?: number }) {
  const parts = [item.signature ? (item.revision ? `Nova assinatura pendente: edição ${item.revision} da ata anteriormente assinada` : 'Assinatura da ata pendente') : null, item.actions ? `${item.actions} ${item.actions === 1 ? 'ação pendente' : 'ações pendentes'}` : null, item.missingDeadlines ? `Definir data prevista de conclusão de ${item.missingDeadlines} ${item.missingDeadlines === 1 ? 'ação' : 'ações'}` : null].filter(Boolean);
  return `${parts.join(' e ')} · ${item.title}`;
}