export type LegalCategory = 'minutes' | 'contracts' | 'templates';
export type LegalSubject = { id: string; title: string; description: string; decisions: string; responsible?: string; responsibles?: string[]; completionDate?: string; confidential?: boolean };
export type LegalParticipant = { id: string; name: string; signature: string; signedAt: string; userId?: string; signedBy?: string };
export type LegalContent = { location: string; counterpart: string; participants: LegalParticipant[]; subjects: LegalSubject[]; revision?: number; lastEditAt?: string };
export function emptyLegalContent(): LegalContent { return { location: '', counterpart: '', participants: [], subjects: [] }; }
export function parseLegalContent(value: unknown): LegalContent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyLegalContent();
  const v = value as Record<string, unknown>;
  return { location: typeof v.location === 'string' ? v.location : '', counterpart: typeof v.counterpart === 'string' ? v.counterpart : '', participants: Array.isArray(v.participants) ? v.participants as LegalParticipant[] : [], subjects: Array.isArray(v.subjects) ? v.subjects as LegalSubject[] : [], ...(typeof v.revision === 'number' ? { revision: v.revision } : {}), ...(typeof v.lastEditAt === 'string' ? { lastEditAt: v.lastEditAt } : {}) };
}
/** Only ERP-registered participants (linked userId) sign; external guests stay listed as participants only. */
export function legalSigners(content: LegalContent) { return content.participants.filter(p => Boolean(p.userId) && p.name.trim()); }
/** Participation is descriptive, not signing authorization; legacy unlinked names remain recognizable. */
export function legalUserParticipated(content: LegalContent, user: { id: string; full_name: string } | null | undefined): boolean {
  if (!user) return false;
  const name = normalizeLegalText(user.full_name.trim()).replace(/\s+/g, ' ');
  return content.participants.some(p => p.userId ? p.userId === user.id : Boolean(name) && normalizeLegalText(p.name.trim()).replace(/\s+/g, ' ') === name);
}
export function allParticipantsSigned(content: LegalContent) { const signers = legalSigners(content); return signers.length > 0 && signers.every(p => p.signature && p.signedAt); }
export function clearLegalSignatures(content: LegalContent): LegalContent { return { ...content, participants: content.participants.map(p => ({ ...p, signature: '', signedAt: '' })) }; }
export function legalSubjectResponsibles(subject: LegalSubject): string[] {
  return [...new Set((subject.responsibles ?? [subject.responsible ?? '']).map(name => name.trim()).filter(Boolean))];
}
export function legalPendingCount(content: LegalContent) {
  const signatures = content.participants.filter(p => !p.signature || !p.signedAt).length;
  const actions = content.subjects.filter(s => legalSubjectResponsibles(s).length > 0 && !s.completionDate).length;
  return { signatures, actions, total: signatures + actions };
}
export function legalSearchText(title: string, content: LegalContent) { return normalizeLegalText([title, ...content.subjects.flatMap(s => [s.title, s.description, s.decisions, ...legalSubjectResponsibles(s)])].join(' ')); }
export function normalizeLegalText(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
export function legalDate(value: string | null) { return value ? value.split('-').reverse().join('/') : '—'; }
export type ConfidentialSubjectRow = { record_id: string; subject_id: string; position: number; subject: unknown };
/** Re-inserts admin-only confidential subjects (stored outside the shared content) at their saved positions. */
export function mergeConfidentialSubjects(content: unknown, recordId: string, rows: readonly ConfidentialSubjectRow[]): unknown {
  const own = rows.filter(r => r.record_id === recordId).sort((a, b) => a.position - b.position);
  if (!own.length || !content || typeof content !== 'object') return content;
  const base = content as Record<string, unknown>;
  const subjects = [...(Array.isArray(base.subjects) ? base.subjects as LegalSubject[] : [])];
  for (const r of own) subjects.splice(Math.min(r.position, subjects.length), 0, { ...(r.subject as LegalSubject), id: r.subject_id, confidential: true });
  return { ...base, subjects };
}
/** Splits subjects into the shared content and admin-only confidential rows with their positions. */
export function splitConfidentialSubjects(content: LegalContent) {
  const confidential = content.subjects.map((subject, position) => ({ subject, position })).filter(x => x.subject.confidential);
  return { content: { ...content, subjects: content.subjects.filter(s => !s.confidential).map(({ confidential: _c, ...s }) => s) }, confidential };
}
/** Acronyms and state abbreviations that stay uppercase when an all-caps title is lowered. */
const TITLE_ACRONYMS = new Set(['OKR', 'OKRS', "OKR'S", 'OS', 'ERP', 'CRM', 'PDF', 'LUC', 'QR', 'PIX', 'CNPJ', 'CPF', 'PJ', 'PF', 'TI', 'RH', 'API', 'EAP', 'CPM', 'MEI', 'KPI', 'SLA', 'SQL', 'URL', 'UI', 'UX', 'UF', 'QE', 'BR', 'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO']);
/**
 * Keeps the atas' title standard: normal sentence case. A title typed with Caps Lock on
 * (every letter uppercase) is lowered when saving, keeping known acronyms and the first
 * letter after separators. Titles written in mixed case are kept exactly as typed.
 */
export function normalizeLegalTitle(value: string): string {
  const text = value.trim();
  const letters = [...text].filter(c => /\p{L}/u.test(c));
  if (letters.length < 2 || letters.some(c => c !== c.toUpperCase())) return value;
  const lowered = text.toLowerCase().replace(/[\p{L}'’&]+/gu, token => (TITLE_ACRONYMS.has(token.toUpperCase()) ? token.toUpperCase() : token));
  return lowered.split(/([:|]|\s+[-–—]\s+)/).map(part => part.replace(/^(\s*)(\p{Ll})/u, (_m, spaces: string, letter: string) => spaces + letter.toUpperCase())).join('');
}
/** Applies the title standard to the ata/document title and to each subject or section title. */
export function normalizeLegalContentTitles(content: LegalContent): LegalContent {
  return { ...content, subjects: content.subjects.map(s => ({ ...s, title: normalizeLegalTitle(s.title) })) };
}
