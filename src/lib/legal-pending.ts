import { parseLegalContent } from './legal';
import { canSignParticipant } from './signatures';

export function legalSignaturePendingItems(records: readonly { id: string; title: string; category: string; content: unknown; created_by: string }[], user: { id: string; full_name: string }) {
  return records.filter(record => record.category === 'minutes' && parseLegalContent(record.content).participants.some(participant => canSignParticipant(participant, user) && (!participant.signature || !participant.signedAt)))
    .map(record => ({ recordId: record.id, title: record.title, requesterId: record.created_by }));
}