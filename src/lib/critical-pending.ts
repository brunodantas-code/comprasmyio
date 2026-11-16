import { pendingApprovalSteps, type ApprovalStepOrder } from './approval-pending';
import { requestedDeadline, type DeadlineOrder } from './supply-deadlines';

export type CriticalPending={key:string;title:string;app:string;due:string;route:'/legal'|'/dashboard'|'/mytosis'|'/pendentes';record:string;task?:string};
export function dueToday<T extends {due:string|null;completed?:boolean;canceled?:boolean}>(rows:readonly T[],today:string){return rows.filter(r=>r.due===today&&!r.completed&&!r.canceled);}

type CriticalSupplyOrder = DeadlineOrder & ApprovalStepOrder & { payment_date: string | null };
type CriticalApprovalStep = { order_id: string; approver_id: string | null; step_index: number; status: string };

export function criticalSupplyOrders<T extends CriticalSupplyOrder>(orders: readonly T[], steps: readonly CriticalApprovalStep[], userId: string, isBuyer: boolean, today: string): T[] {
  const byId = new Map(orders.map(order => [order.id, order]));
  const joinedSteps = steps.map(step => ({ ...step, purchase_orders: byId.get(step.order_id) ?? null }));
  const approvals = new Set(pendingApprovalSteps(joinedSteps, userId).map(step => step.order_id));
  return orders.filter(order => {
    if (['cancelado', 'entregue', 'recebido_ok', 'pago', 'conciliado'].includes(order.status)) return false;
    const due = order.request_model === 'pagamento' ? order.payment_date : requestedDeadline(order);
    if (due !== today) return false;
    return approvals.has(order.id) || (isBuyer && order.approval_status === 'aprovado' && order.request_model !== 'pagamento');
  });
}
