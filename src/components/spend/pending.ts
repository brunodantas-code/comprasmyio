import { z } from 'zod';

const adjustmentSchema = z.object({
  line_id: z.string(), receipt_id: z.string().nullable(), card_id: z.string(),
  holder_id: z.string(), merchant: z.string(), amount: z.number(), date: z.string(),
  status: z.string(), message: z.string(), requested_at: z.string(),
  corrected_at: z.string().nullable(), requester_name: z.string().nullable(),
  kind: z.enum(['notify','adjustment']).optional(),
});
export type SpendAdjustment = z.infer<typeof adjustmentSchema>;

const advancePendingSchema = z.object({
  advance_id: z.string(), holder_id: z.string(), due_at: z.string(), purpose: z.string(),
  amount: z.number(), remaining: z.number(), requester_name: z.string().nullable(),
});
export type SpendAdvancePending = z.infer<typeof advancePendingSchema>;
export function spendPendingAdvances(value: unknown, userId?: string, today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })): SpendAdvancePending[] {
  return z.array(advancePendingSchema).parse(value).filter(row => (!userId || row.holder_id === userId) && row.due_at < today && row.remaining > 0);
}

export function activeSpendNotices<T extends { line_id: string | null }>(notices: readonly T[], pending: readonly SpendAdjustment[]): T[] {
  const activeLines = new Set(pending.map(item => item.line_id));
  return notices.filter(notice => !notice.line_id || activeLines.has(notice.line_id));
}
export function spendPendingAdjustments(value: unknown, userId?: string): SpendAdjustment[] {
  const rows = z.array(adjustmentSchema).parse(value);
  const pending = new Map<string, SpendAdjustment>();
  for (const row of rows) {
    if (userId && row.holder_id !== userId) continue;
    if (row.status !== 'adjustment') continue;
    if (row.corrected_at && Date.parse(row.corrected_at) > Date.parse(row.requested_at)) continue;
    const previous = pending.get(row.line_id);
    if (!previous || Date.parse(row.requested_at) > Date.parse(previous.requested_at)) pending.set(row.line_id, row);
  }
  return [...pending.values()];
}