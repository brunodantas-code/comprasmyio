export type LegalCategory = 'minutes' | 'contracts' | 'templates';
export type LegalSubject = { id: string; title: string; description: string; decisions: string };
export type LegalParticipant = { id: string; name: string; signature: string; signedAt: string };
export type LegalContent = { location: string; counterpart: string; participants: LegalParticipant[]; subjects: LegalSubject[] };
export function emptyLegalContent(): LegalContent { return { location: '', counterpart: '', participants: [], subjects: [] }; }
export function parseLegalContent(value: unknown): LegalContent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyLegalContent();
  const v = value as Record<string, unknown>;
  return { location: typeof v.location === 'string' ? v.location : '', counterpart: typeof v.counterpart === 'string' ? v.counterpart : '', participants: Array.isArray(v.participants) ? v.participants as LegalParticipant[] : [], subjects: Array.isArray(v.subjects) ? v.subjects as LegalSubject[] : [] };
}
export function allParticipantsSigned(content: LegalContent) { return content.participants.length > 0 && content.participants.every(p => p.name.trim() && p.signature && p.signedAt); }
export function clearLegalSignatures(content: LegalContent): LegalContent { return { ...content, participants: content.participants.map(p => ({ ...p, signature: '', signedAt: '' })) }; }
export function legalSearchText(title: string, content: LegalContent) { return normalizeLegalText([title, ...content.subjects.flatMap(s => [s.title, s.description, s.decisions])].join(' ')); }
export function normalizeLegalText(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
export function legalDate(value: string | null) { return value ? value.split('-').reverse().join('/') : '—'; }