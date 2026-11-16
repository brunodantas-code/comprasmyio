export type ApprovalStepOrder = {
  requester_id: string;
  approval_status: string;
  status: string;
};

type ApprovalStep = {
  order_id: string;
  step_index: number;
  approver_id: string | null;
  status: string;
  purchase_orders: ApprovalStepOrder | ApprovalStepOrder[] | null;
};

export function pendingApprovalSteps<T extends ApprovalStep>(steps: readonly T[], userId: string): T[] {
  return steps.filter((step) => {
    const order = Array.isArray(step.purchase_orders) ? step.purchase_orders[0] : step.purchase_orders;
    if (!order || order.approval_status !== "aguardando_aprovacao" || order.status === "cancelado") return false;
    if (step.status !== "pendente" || step.approver_id !== userId || order.requester_id === userId) return false;
    return !steps.some((earlier) => earlier.order_id === step.order_id && earlier.status === "pendente" && earlier.step_index < step.step_index);
  });
}