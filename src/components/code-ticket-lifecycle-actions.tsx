import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { canConcludeCodeTicket } from "@/lib/code-conversation";
import { canReopenCodeTicket, codeReopenReasonSchema, confirmCodeTicketConclusion } from "@/lib/code-ticket-lifecycle";
import { confirmAction } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useCdeLook } from "@/components/cde/cde-look";
import { ICONS } from "@/components/cde/cde-render";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type LifecycleTicket = { id: string; ticket_number: number; status: string; reporter_id: string; assignee_id: string | null };

export function CodeTicketLifecycleActions({ ticket, userId, isCodeAdmin, onChanged, onConcluded }: {
  ticket: LifecycleTicket;
  userId?: string;
  isCodeAdmin: boolean;
  onChanged: () => void;
  onConcluded: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reason, setReason] = useState("");
  const conclusionLook = useCdeLook("confirm", true, "components/code-ticket-lifecycle-actions.tsx", true);
  const ConclusionIcon = ICONS[conclusionLook.icon ?? "Check"] ?? Check;
  useEffect(() => { setReopenOpen(false); setReason(""); }, [ticket.id, ticket.status]);

  const conclude = useMutation({
    mutationFn: async () => {
      if (!canConcludeCodeTicket(ticket.status, ticket.reporter_id === userId)) throw new Error("Este chamado não está disponível para conclusão.");
      const { data, error } = await supabase.from("development_tickets").update({ status: "concluido" })
        .eq("id", ticket.id).eq("status", "atendido").eq("reporter_id", userId ?? "").select("id").single();
      if (error) throw error;
      if (!data) throw new Error("O chamado foi alterado. Atualize antes de concluir.");
    },
    onSuccess: () => { toast.success("Chamado concluído"); onChanged(); onConcluded(); },
    onError: (error: Error) => toast.error(error.message),
  });
  const reopen = useMutation({
    mutationFn: async () => {
      if (!canReopenCodeTicket(ticket, userId, isCodeAdmin)) throw new Error("Sem permissão para reabrir este chamado.");
      const cleanReason = codeReopenReasonSchema.parse(reason);
      const { error } = await supabase.rpc("reopen_code_ticket", { _ticket_id: ticket.id, _reason: cleanReason });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Chamado reaberto — Em atendimento"); setReopenOpen(false); setReason(""); onChanged(); },
    onError: (error: Error) => toast.error(error.message),
  });

  async function requestConclusion() {
    if (confirming || conclude.isPending) return;
    setConfirming(true);
    try {
      await confirmCodeTicketConclusion(ticket.status, ticket.reporter_id === userId, () => confirmAction(
        `Confirma que a correção ou melhoria do chamado ${ticket.ticket_number} foi entregue conforme esperado? O chamado será marcado como Concluído.`,
        { title: "Concluir chamado?", confirmLabel: "Concluir chamado" },
      ), () => conclude.mutateAsync());
    } catch {
      // The mutation displays the failure and keeps the ticket open.
    } finally { setConfirming(false); }
  }

  if (!canConcludeCodeTicket(ticket.status, ticket.reporter_id === userId) && !canReopenCodeTicket(ticket, userId, isCodeAdmin)) return null;
  return <div className="flex flex-wrap items-center gap-2">
    {canConcludeCodeTicket(ticket.status, ticket.reporter_id === userId) ? <Button type="button" actionKind="specific" variant={conclusionLook.variant as React.ComponentProps<typeof Button>["variant"]} size={(conclusionLook.size || "default") as React.ComponentProps<typeof Button>["size"]} style={conclusionLook.style} className={cn(conclusionLook.className, "!border !border-foreground !border-solid")} onClick={requestConclusion} disabled={confirming || conclude.isPending}><ConclusionIcon className={conclusionLook.iconClass || "h-4 w-4"} />{conclude.isPending ? "Concluindo..." : "Marcar como concluído"}</Button> : null}
    {canReopenCodeTicket(ticket, userId, isCodeAdmin) ? <Button type="button" actionKind="standard" onClick={() => setReopenOpen(true)}><RotateCcw className="h-4 w-4" />Reabrir chamado</Button> : null}
    <Dialog open={reopenOpen} onOpenChange={(open) => { if (reopen.isPending) return; setReopenOpen(open); if (!open) setReason(""); }}>
      <DialogContent className="max-w-lg" onEscapeKeyDown={(event) => { if (reopen.isPending) event.preventDefault(); }} onPointerDownOutside={(event) => { if (reopen.isPending) event.preventDefault(); }}>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!reopen.isPending) reopen.mutate(); }}>
          <DialogHeader><DialogTitle>Reabrir chamado {ticket.ticket_number}</DialogTitle><DialogDescription>O chamado voltará para Em atendimento. O motivo ficará registrado no Histórico.</DialogDescription></DialogHeader>
          <div className="space-y-1"><Label htmlFor="code-reopen-reason">Motivo da reabertura</Label><Textarea id="code-reopen-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={2000} className="min-h-28" required autoFocus disabled={reopen.isPending} /></div>
          <DialogFooter><Button type="submit" actionKind="standard" disabled={reopen.isPending || !reason.trim()}><RotateCcw className="h-4 w-4" />{reopen.isPending ? "Reabrindo..." : "Reabrir chamado"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}