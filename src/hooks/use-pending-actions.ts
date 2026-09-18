import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";

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
    queryKey: ["pending-actions", currentUser?.id, currentUser?.isAdmin, currentUser?.isComprador],
    enabled: Boolean(currentUser),
    queryFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw authError ?? new Error("Sessão não encontrada");
      const userId = authData.user.id;

      const [stepsResult, deletionsResult, codeResult, codeMessagesResult, supplyQueueResult] = await Promise.all([
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
          .select("id, ticket_number, title, reporter_id, status"),
        supabase
          .from("development_ticket_messages")
          .select("id, ticket_id, message_type, parent_message_id, development_tickets(ticket_number,title,reporter_id)"),
        currentUser?.isComprador
          ? supabase
              .from("purchase_orders")
              .select("id", { count: "exact", head: true })
              .eq("approval_status", "aprovado")
              .in("status", ["pendente", "comprado_aguardando", "recebido_problema"])
          : Promise.resolve({ count: 0, error: null }),
      ]);

      if (stepsResult.error) throw stepsResult.error;
      if (deletionsResult.error) throw deletionsResult.error;
      if (codeResult.error) throw codeResult.error;
      if (codeMessagesResult.error) throw codeMessagesResult.error;
      if (supplyQueueResult.error) throw supplyQueueResult.error;

      const isAdmin = currentUser?.isAdmin ?? false;
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
      const answeredQuestionIds = new Set(
        (codeMessagesResult.data ?? [])
          .filter((message) => message.message_type === "answer" && message.parent_message_id)
          .map((message) => message.parent_message_id),
      );
      const codeItems = new Map<string, { ticketId: string; ticketNumber: number; title: string; reason: "responder" | "aceitar" | "atender" }>();
      for (const ticket of codeResult.data ?? []) {
        if (ticket.status === "atendido" && ticket.reporter_id === userId) {
          codeItems.set(ticket.id, { ticketId: ticket.id, ticketNumber: ticket.ticket_number, title: ticket.title, reason: "aceitar" });
        } else if (isAdmin && (ticket.status === "aberto" || ticket.status === "em_atendimento")) {
          codeItems.set(ticket.id, { ticketId: ticket.id, ticketNumber: ticket.ticket_number, title: ticket.title, reason: "atender" });
        }
      }
      for (const message of codeMessagesResult.data ?? []) {
        const relatedTicket = Array.isArray(message.development_tickets) ? message.development_tickets[0] : message.development_tickets;
        if (message.message_type !== "question" || answeredQuestionIds.has(message.id) || relatedTicket?.reporter_id !== userId) continue;
        codeItems.set(message.ticket_id, { ticketId: message.ticket_id, ticketNumber: relatedTicket.ticket_number, title: relatedTicket.title, reason: "responder" });
      }
      const pendingCodeItems = [...codeItems.values()];
      const pendingCodeTickets = pendingCodeItems.length;
      const pendingSupplyQueue = supplyQueueResult.count ?? 0;

      return {
        approvals: pendingApprovals,
        userDeletions: pendingUserDeletions,
        codeTickets: pendingCodeTickets,
        codeItems: pendingCodeItems,
        supplyQueue: pendingSupplyQueue,
        supply: pendingApprovals + pendingUserDeletions + pendingSupplyQueue,
        total: pendingApprovals + pendingUserDeletions + pendingCodeTickets + pendingSupplyQueue,
      };
    },
    staleTime: 30_000,
  });
}