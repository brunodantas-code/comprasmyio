import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type ApprovalStep = {
  order_id: string;
  step_index: number;
  approver_id: string | null;
  status: string;
  purchase_orders: { requester_id: string } | { requester_id: string }[] | null;
};

function requesterId(step: ApprovalStep) {
  const order = Array.isArray(step.purchase_orders) ? step.purchase_orders[0] : step.purchase_orders;
  return order?.requester_id ?? null;
}

export function usePendingActions() {
  return useQuery({
    queryKey: ["pending-actions"],
    queryFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw authError ?? new Error("Sessão não encontrada");
      const userId = authData.user.id;

      const [rolesResult, stepsResult, deletionsResult, codeResult] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase
          .from("approval_steps")
          .select("order_id, step_index, approver_id, status, purchase_orders(requester_id)")
          .eq("status", "pendente"),
        supabase
          .from("user_deletion_requests")
          .select("id, requested_by")
          .eq("status", "pendente"),
        supabase
          .from("development_tickets")
          .select("id", { count: "exact", head: true })
          .eq("reporter_id", userId)
          .eq("status", "atendido"),
      ]);

      if (rolesResult.error) throw rolesResult.error;
      if (stepsResult.error) throw stepsResult.error;
      if (deletionsResult.error) throw deletionsResult.error;
      if (codeResult.error) throw codeResult.error;

      const isAdmin = (rolesResult.data ?? []).some((role) => role.role === "admin");
      const steps = (stepsResult.data ?? []) as ApprovalStep[];
      const pendingApprovals = steps.filter((step) => {
        if (requesterId(step) === userId) return false;
        if (step.approver_id !== userId && !isAdmin) return false;
        return !steps.some(
          (earlier) => earlier.order_id === step.order_id && earlier.step_index < step.step_index,
        );
      }).length;
      const pendingUserDeletions = isAdmin
        ? (deletionsResult.data ?? []).filter((request) => request.requested_by !== userId).length
        : 0;
      const pendingCodeTickets = codeResult.count ?? 0;

      return {
        approvals: pendingApprovals,
        userDeletions: pendingUserDeletions,
        codeTickets: pendingCodeTickets,
        supply: pendingApprovals + pendingUserDeletions,
        total: pendingApprovals + pendingUserDeletions + pendingCodeTickets,
      };
    },
    staleTime: 30_000,
  });
}