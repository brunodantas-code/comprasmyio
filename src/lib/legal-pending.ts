import { parseLegalContent } from './legal';
import { canSignParticipant } from './signatures';

type PendingAction = { record_id: string; subject_id: string; responsible_id: string; completed_at: string | null; archived: boolean };

/** Pending legal items per minutes record for one user: own unsigned signature plus own open actions in current subjects. */
export function legalSignaturePendingItems(records: readonly { id: string; title: string; category: string; content: unknown; created_by: string }[], user: { id: string; full_name: string }, actions: readonly PendingAction[] = []) {
  return records.filter(record => record.category === 'minutes').map(record => {
    const content = parseLegalContent(record.content);
    const signature = content.participants.some(participant => canSignParticipant(participant, user) && (!participant.signature || !participant.signedAt));
    const subjectIds = new Set(content.subjects.map(s => s.id));
    const openActions = actions.filter(a => a.record_id === record.id && subjectIds.has(a.subject_id) && a.responsible_id === user.id && !a.archived && !a.completed_at).length;
    return { recordId: record.id, title: record.title, requesterId: record.created_by, signature, actions: openActions, count: (signature ? 1 : 0) + openActions };
  }).filter(item => item.count > 0);
}

export function legalPendingLabel(item: { signature: boolean; actions: number; title: string }) {
  const parts = [item.signature ? 'Assinatura da ata pendente' : null, item.actions ? `${item.actions} ${item.actions === 1 ? 'ação pendente' : 'ações pendentes'}` : null].filter(Boolean);
  return `${parts.join(' e ')} · ${item.title}`;
}