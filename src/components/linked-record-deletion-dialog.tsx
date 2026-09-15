import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type LinkField = "project_id" | "client_id" | "cost_center_id" | "request_type";
type DiversosRegistry = "request_type" | "additional_step_type" | "stock_destination";
type Destination = { id: string; name: string };

type LinkedOrder = {
  id: string;
  approval_number: string | null;
  item_name: string;
};

type ClientLink = {
  record_key: string;
  record_type: string;
  record_label: string;
  record_detail: string;
};

export function LinkedRecordDeletionDialog({
  entityId,
  entityName,
  entityLabel,
  linkField,
  destinations,
  onDelete,
  deleting,
  registry,
  deleteBlockedReason,
}: {
  entityId: string;
  entityName: string;
  entityLabel: string;
  linkField: LinkField;
  destinations: Destination[];
  onDelete: () => void;
  deleting?: boolean;
  registry?: DiversosRegistry;
  deleteBlockedReason?: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [expandedLinks, setExpandedLinks] = useState<Record<string, boolean>>({});
  const queryKey = ["linked-orders", registry ?? linkField, entityId];
  const { data: records = [], isLoading, isError, error } = useQuery({
    queryKey,
    enabled: open && !deleteBlockedReason,
    queryFn: async () => {
      if (registry) {
        const { data, error: linksError } = await supabase.rpc("get_diversos_deletion_links", {
          _registry: registry,
          _source_code: entityId,
        });
        if (linksError) throw linksError;
        return (data ?? []).map((link: ClientLink) => ({
          key: link.record_key,
          label: `${link.record_type}: ${link.record_label}`,
          detail: link.record_detail,
        }));
      }
      if (linkField === "client_id") {
        const { data, error: linksError } = await supabase.rpc("get_client_deletion_links", { _client_id: entityId });
        if (linksError) throw linksError;
        return (data ?? []).map((link: ClientLink) => ({
          key: link.record_key,
          label: link.record_label,
          detail: link.record_detail,
        }));
      }

      const { data, error } = await supabase
        .from("purchase_orders")
        .select("id,approval_number,item_name")
        .eq(linkField, entityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as LinkedOrder[]).map((order) => ({
        key: order.id,
        label: order.approval_number || "Solicitação sem número",
        detail: order.item_name,
      }));
    },
  });

  useEffect(() => {
    if (!open) {
      setTargets({});
      setExpandedLinks({});
    }
  }, [open]);

  const reallocate = useMutation({
    mutationFn: async ({ recordKey, destinationId }: { recordKey: string; destinationId: string }) => {
      if (registry) {
        const { error: reallocationError } = await supabase.rpc("reallocate_diversos_link", {
          _registry: registry,
          _record_key: recordKey,
          _source_code: entityId,
          _destination_code: destinationId,
        });
        if (reallocationError) throw reallocationError;
        return;
      }
      if (linkField === "client_id") {
        const { error: reallocationError } = await supabase.rpc("reallocate_client_link", {
          _record_key: recordKey,
          _source_client_id: entityId,
          _destination_client_id: destinationId,
        });
        if (reallocationError) throw reallocationError;
        return;
      }

      const values = linkField === "project_id"
        ? { project_id: destinationId }
        : linkField === "cost_center_id"
          ? { cost_center_id: destinationId }
          : { request_type: destinationId };
      const { error } = await supabase.from("purchase_orders").update(values).eq("id", recordKey);
      if (error) throw error;
    },
    onSuccess: async (_, variables) => {
      toast.success("Vínculo realocado");
      setTargets((current) => {
        const next = { ...current };
        delete next[variables.recordKey];
        return next;
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey }),
        qc.invalidateQueries({ queryKey: ["projects"] }),
        qc.invalidateQueries({ queryKey: ["clients"] }),
        qc.invalidateQueries({ queryKey: ["project-budget-summaries"] }),
        qc.invalidateQueries({ queryKey: ["orders"] }),
        qc.invalidateQueries({ queryKey: ["myio-orders"] }),
        qc.invalidateQueries({ queryKey: ["cash-flow-payables"] }),
        qc.invalidateQueries({ queryKey: ["request-types"] }),
        qc.invalidateQueries({ queryKey: ["additional-step-types"] }),
        qc.invalidateQueries({ queryKey: ["stock-destinations"] }),
        qc.invalidateQueries({ queryKey: ["approval-rules"] }),
        qc.invalidateQueries({ queryKey: ["unit-products"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const availableDestinations = destinations.filter((item) => item.id !== entityId);
  const hasLinks = records.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" title={`Excluir ${entityLabel}`} aria-label={`Excluir ${entityLabel}`} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Excluir {entityLabel}</DialogTitle>
          <DialogDescription>
            {deleteBlockedReason
              ? deleteBlockedReason
              : isLoading
              ? "Verificando solicitações vinculadas..."
              : isError
                ? "Não foi possível verificar os vínculos. A exclusão permanece bloqueada."
              : hasLinks
                ? `${records.length} vínculo(s) está(ão) associado(s) a “${entityName}”. Realoque cada um antes de excluir.`
                : `Confirma a exclusão de “${entityName}”?`}
          </DialogDescription>
        </DialogHeader>

        {isError && <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Tente novamente."}</p>}

        {hasLinks && (
          <div className="space-y-3">
            {records.map((record) => (
              <Collapsible key={record.key} open={expandedLinks[record.key] ?? false} onOpenChange={(expanded) => setExpandedLinks((current) => ({ ...current, [record.key]: expanded }))} className="border-b pb-3">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-medium">{record.label}</p>
                  <CollapsibleTrigger asChild>
                    <Button size="icon" variant="ghost" aria-label={(expandedLinks[record.key] ?? false) ? `Recolher ${record.label}` : `Expandir ${record.label}`} title={(expandedLinks[record.key] ?? false) ? "Recolher" : "Expandir"}>
                      {(expandedLinks[record.key] ?? false) ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="pt-3">
                  <p className="mb-3 text-sm text-muted-foreground">{record.detail}</p>
                  <div className="grid gap-3 sm:grid-cols-[minmax(180px,1fr)_auto] sm:items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Novo {entityLabel}</Label>
                      <Select value={targets[record.key] ?? ""} onValueChange={(value) => setTargets((current) => ({ ...current, [record.key]: value }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {availableDestinations.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      disabled={!targets[record.key] || reallocate.isPending}
                      onClick={() => {
                        const destinationId = targets[record.key];
                        if (destinationId) reallocate.mutate({ recordKey: record.key, destinationId });
                      }}
                    >
                      Realocar
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
            {!availableDestinations.length && <p className="text-sm text-destructive">Cadastre outro {entityLabel} para realizar a realocação.</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={Boolean(deleteBlockedReason) || isLoading || isError || hasLinks || deleting}
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
          >
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}