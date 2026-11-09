export const SUPPLY_CODE_MAX = 10;
export const DEFAULT_DEADLINE_ALERTS = { warningDays: 7, criticalDays: 3 };
export type DeadlineAlerts = typeof DEFAULT_DEADLINE_ALERTS;
export type DeadlineOrder = { id: string; created_at: string; deadline_type: string; deadline_date: string | null; delivery_forecast: string | null; status: string; request_model?: string | null };
export function parseDeadlineAlerts(raw?: string | null): DeadlineAlerts {
  try {
    const v = JSON.parse(raw || '{}');
    if (Number.isInteger(v.warningDays) && Number.isInteger(v.criticalDays) && v.criticalDays >= 0 && v.warningDays >= v.criticalDays && v.warningDays <= 365) return v;
  } catch { /* default */ }
  return DEFAULT_DEADLINE_ALERTS;
}
const dateOnly = (d: string) => d.slice(0, 10);
const day = (d: string) => Date.parse(`${dateOnly(d)}T00:00:00Z`);
export const daysBetween = (a: string, b: string) => (day(b) - day(a)) / 86400000;
export function requestedDeadline(o: DeadlineOrder): string | null {
  if (['pagamento', 'reembolso'].includes(o.request_model || '')) return null;
  if (o.deadline_date) return o.deadline_date;
  if (o.deadline_type === 'customizado') return null;
  // Historical relative deadlines use the creation week/month, never the current one.
  const d = new Date(day(o.created_at));
  if (Number.isNaN(d.getTime())) return null;
  if (o.deadline_type === 'esta_semana') d.setUTCDate(d.getUTCDate() + (7 - d.getUTCDay()) % 7);
  if (o.deadline_type === 'este_mes') d.setUTCMonth(d.getUTCMonth() + 1, 0);
  return d.toISOString().slice(0, 10);
}
export function deadlineSignals(o: DeadlineOrder, config = DEFAULT_DEADLINE_ALERTS, today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })) {
  const deadline = requestedDeadline(o);
  const completed = ['entregue', 'recebido_ok', 'recebido_problema'].includes(o.status);
  const canceled = o.status === 'cancelado';
  const purchased = o.status === 'comprado_aguardando' || completed;
  const remaining = deadline ? daysBetween(today, deadline) : null;
  const overdue = !canceled && !completed && !!deadline && deadline < today;
  const forecastLate = !canceled && purchased && !!deadline && !!o.delivery_forecast && o.delivery_forecast > deadline;
  const forecastOverdue = !canceled && !completed && !!o.delivery_forecast && o.delivery_forecast < today;
  const purchaseAlert = !canceled && !purchased && remaining !== null && remaining <= config.warningDays
    ? remaining <= config.criticalDays ? 'critical' : 'warning' : null;
  return { deadline, remaining, overdue, forecastLate, forecastOverdue, purchaseAlert, outOfTime: forecastLate || forecastOverdue || overdue };
}
export type TimingLog = { order_id: string; action: string; details: unknown; created_at: string };
export type TimingApproval = { order_id: string; status: string; decided_at: string | null };
export function orderTiming(o: DeadlineOrder, logs: TimingLog[], approvals: TimingApproval[]) {
  const events = logs.filter(l => l.order_id === o.id).sort((a,b) => a.created_at.localeCompare(b.created_at));
  const transition = (statuses: string[]) => events.find(l => l.action === 'status_alterado' && l.details && typeof l.details === 'object' && 'para' in l.details && statuses.includes(String(l.details.para)))?.created_at ?? null;
  const chain = approvals.filter(a => a.order_id === o.id);
  const approved = chain.length && chain.every(a => a.status === 'aprovado' && a.decided_at) ? chain.map(a => a.decided_at || '').sort().at(-1) ?? null : null;
  const purchased = transition(['comprado_aguardando']);
  const delivered = transition(['entregue', 'recebido_ok', 'recebido_problema']);
  const deadline = requestedDeadline(o);
  const late = !!deadline && !!delivered && dateOnly(delivered) > deadline;
  const markers = [deadline && dateOnly(o.created_at) >= deadline ? 'Solicitado no prazo final ou após' : '', deadline && approved && dateOnly(approved) > deadline ? 'Aprovado após o prazo' : '', deadline && purchased && dateOnly(purchased) > deadline ? 'Comprado após o prazo' : '', delivered && o.delivery_forecast && dateOnly(delivered) > o.delivery_forecast ? 'Entregue após a previsão' : ''].filter(Boolean);
  return { approved, purchased, delivered, late, markers, requestToApproval: approved ? daysBetween(o.created_at, approved) : null, approvalToPurchase: approved && purchased ? daysBetween(approved, purchased) : null, purchaseToDelivery: purchased && delivered ? daysBetween(purchased, delivered) : null };
}