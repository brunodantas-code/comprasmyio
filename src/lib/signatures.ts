import { z } from 'zod';
export const signatureImageSchema = z.string().max(180000).regex(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/, 'Assinatura inválida');
export const signDocumentSchema = z.object({ recordId: z.string().uuid(), participantId: z.string().max(100).nullable(), expectedUpdatedAt: z.string().datetime({ offset: true }), password: z.string().min(1, 'Informe sua senha').max(256) });
export function canSignParticipant(p: { userId?: string; name: string }, user: { id: string; full_name: string } | null | undefined) {
  return Boolean(user && (p.userId ? p.userId === user.id : p.name.trim().toLocaleLowerCase() === user.full_name.trim().toLocaleLowerCase()));
}
export function signatureDate(value: string) {
  return new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}