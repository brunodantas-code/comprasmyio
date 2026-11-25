import { z } from 'zod';
const schema = z.object({ metric_id: z.string(), title: z.string(), objective_title: z.string().nullable(), responsible_id: z.string(), due_on: z.string().nullable(), last_checkin: z.string(), overdue: z.boolean(), stale: z.boolean() });
export type IndicadoresPendingKr = z.infer<typeof schema>;
/** A KR is pending for its responsible when its deadline passed without the target, or it has gone more than 7 days without a check-in. */
export function indicadoresPendingKrs(value: unknown, userId?: string): IndicadoresPendingKr[] {
  return z.array(schema).parse(value ?? []).filter(r => (r.overdue || r.stale) && (!userId || r.responsible_id === userId));
}
export function indicadoresPendingReason(r: IndicadoresPendingKr) {
  return [r.overdue && 'Prazo do KR vencido', r.stale && 'Check-in semanal atrasado'].filter(Boolean).join(' · ');
}
