import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { codePendingItems } from "@/lib/code-pending";
import { supplyPendingQuestions } from "@/lib/supply-conversation";

import { legalSignaturePendingItems } from "@/lib/legal-pending";

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
  const { data: currentUser } = useCurrentUser();

  return useQuery({
    queryKey: ["pending-actions", currentUser?.id, currentUser?.isAdmin, currentUser?.isComprador, currentUser?.isCustomerSupportAnalyst],
    enabled: Boolean(currentUser),
    queryFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw authError ?? new Error("Sessão não encontrada");
      const userId = authData.user.id;

      const [stepsResult, deletionsResult, codeResult, codeMessagesResult, supplyQueueResult, supportCallsResult, mytosisResult, codeAdminResult, codeAccessResult, legalResult] = await Promise.all([
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
          .select("id, ticket_number, title, reporter_id, status, created_at"),
        supabase
          .from("development_ticket_messages")
          .select("id, ticket_id, author_id, message_type, parent_message_id, recipient_id, requester_seen_at"),
        currentUser?.isComprador
          ? supabase
              .from("purchase_orders")
              .select("id", { count: "exact", head: true })
              .eq("approval_status", "aprovado")
              .neq("request_type", "pagamento")
              .in("status", ["pendente", "comprado_aguardando", "recebido_problema"])
          : Promise.resolve({ count: 0, error: null }),
        supabase.from("internal_calls").select("id, call_number, title, status, reporter_id").order("created_at", { ascending: false }),
        supabase.rpc("mytosis_pending_questions"),
        supabase.from("erp_admins").select("user_id").eq("user_id", userId).maybeSingle(),
        supabase.from("user_app_access").select("user_id").eq("user_id", userId).eq("app_key", "development").maybeSingle(),
        supabase.from("legal_records").select("id,title,category,content,created_by").eq("category", "minutes"),
      ]);

      if (stepsResult.error) throw stepsResult.error;
      if (deletionsResult.error) throw deletionsResult.error;
      if (codeResult.error) throw codeResult.error;
      if (codeMessagesResult.error) throw codeMessagesResult.error;
      if (supplyQueueResult.error) throw supplyQueueResult.error;
      if (supportCallsResult.error) throw supportCallsResult.error;
      if (mytosisResult.error) throw mytosisResult.error;
      if (codeAdminResult.error) throw codeAdminResult.error;
      if (codeAccessResult.error) throw codeAccessResult.error;

      if (legalResult.error) throw legalResult.error;
      const legalItems = legalSignaturePendingItems(legalResult.data ?? [], { id: userId, full_name: currentUser?.full_name ?? "" });

      const isAdmin = currentUser?.isAdmin ?? false;
      const steps = (stepsResult.data ?? []) as ApprovalStep[];
      const pendingApprovals = steps.filter((step) => {
        if (requesterId(step) === userId) return false;
        if (step.approver_id !== userId) return false;
        return !steps.some(
          (earlier) => earlier.order_id === step.order_id && earlier.step_index < step.step_index,
        );
      }).length;
      const pendingUserDeletions = isAdmin
        ? (deletionsResult.data ?? []).filter((request) => request.requested_by !== userId).length
        : 0;
      const pendingCodeItems = codePendingItems(codeResult.data ?? [], codeMessagesResult.data ?? [], userId, Boolean(codeAdminResult.data && codeAccessResult.data));
      const reporterIds = [...new Set(pendingCodeItems.map((item) => item.reporterId).filter(Boolean))];
      if (reporterIds.length) {
        const { data: reporters } = await supabase.from("profiles").select("id, full_name, email").in("id", reporterIds);
        for (const item of pendingCodeItems) {
          const reporter = reporters?.find((profile) => profile.id === item.reporterId);
          item.reporterName = reporter?.full_name || reporter?.email || undefined;
        }
      }
      const pendingCodeTickets = pendingCodeItems.length;
      const [supplyMessages, supplyOrders] = await Promise.all([
        supabase.from('supply_order_messages').select('*'),
        supabase.from('purchase_orders').select('id,requester_id,approval_number,item_name,status,request_type'),
      ]);
      if (supplyMessages.error) throw supplyMessages.error;
      if (supplyOrders.error) throw supplyOrders.error;
      const supplyQuestions = supplyPendingQuestions(supplyMessages.data ?? [], supplyOrders.data ?? [], userId, Boolean(currentUser?.canEditSupplyPurchase));
      const supplyQuestionCount = supplyQuestions.reduce((sum, q) => sum + q.count, 0);
      const pendingSupplyQueue = supplyQueueResult.count ?? 0;
      const supportCallItems = (supportCallsResult.data ?? [])
        .filter((call) => currentUser?.isCustomerSupportAnalyst
          ? ["aberto", "em_atendimento", "aguardando"].includes(call.status)
          : call.reporter_id === userId && call.status === "resolvido")
        .map((call) => ({ callId: call.id, callNumber: call.call_number ?? "—", title: call.title, status: call.status, reason: call.status === "resolvido" ? "confirmar" as const : "atender" as const }));
      const supportCalls = supportCallItems.length;

      return {
        legalItems,
        legalSignatures: legalItems.length,
        supplyQuestions,
        mytosisItems: mytosisResult.data ?? [],
        mytosisQuestions: mytosisResult.data?.length ?? 0,
        approvals: pendingApprovals,
        userDeletions: pendingUserDeletions,
        codeTickets: pendingCodeTickets,
        codeItems: pendingCodeItems,
        supplyQueue: pendingSupplyQueue,
        supportCalls,
        supportCallItems,
        isCustomerSupportAnalyst: currentUser?.isCustomerSupportAnalyst ?? false,
        supply: pendingApprovals + pendingUserDeletions + pendingSupplyQueue + supplyQuestionCount,
        total: legalItems.length + pendingApprovals + pendingUserDeletions + pendingCodeTickets + pendingSupplyQueue + supportCalls + supplyQuestionCount + (mytosisResult.data?.length ?? 0),
      };
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}