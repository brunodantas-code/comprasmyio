import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type LinkField = "project_id" | "client_id" | "cost_center_id" | "request_type";
type DiversosRegistry = "request_type" | "additional_step_type" | "stock_destination" | "damage_reason";
type DestinationKind = "project" | "client" | "unit";
type Destination = { id: string; name: string; kind?: DestinationKind; parentClientId?: string };

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
  sourceEntityType,
  trigger,
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
  sourceEntityType?: "project" | "client";
  trigger?: ReactNode;
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
          type: link.record_key.split(":", 1)[0],
          label: link.record_label,
          detail: link.record_detail,
        }));
      }
      if (linkField === "project_id" && sourceEntityType === "project") {
        const { data, error: linksError } = await supabase.rpc("get_project_deletion_links", { _project_id: entityId });
        if (linksError) throw linksError;
        return (data ?? []).map((link: ClientLink) => ({
          key: link.record_key,
          type: link.record_key.split(":", 1)[0],
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
    mutationFn: async ({ recordKey, destinationValue }: { recordKey: string; destinationValue: string }) => {
      const destination = destinations.find((item) => `${item.kind ?? "legacy"}:${item.id}` === destinationValue);
      if (!destination) throw new Error("Destino inválido");
      if (registry) {
        const { error: reallocationError } = await supabase.rpc("reallocate_diversos_link", {
          _registry: registry,
          _record_key: recordKey,
          _source_code: entityId,
          _destination_code: destination.id,
        });
        if (reallocationError) throw reallocationError;
        return;
      }
      if (sourceEntityType && destination.kind) {
        const { error: reallocationError } = await supabase.rpc("reallocate_allocation_link", {
          _record_key: recordKey,
          _source_type: sourceEntityType,
          _source_id: entityId,
          _destination_type: destination.kind,
          _destination_id: destination.id,
        });
        if (reallocationError) throw reallocationError;
        return;
      }
      if (linkField === "client_id") {
        const { error: reallocationError } = await supabase.rpc("reallocate_client_link", {
          _record_key: recordKey,
          _source_client_id: entityId,
          _destination_client_id: destination.id,
        });
        if (reallocationError) throw reallocationError;
        return;
      }

      const values = linkField === "project_id"
        ? { project_id: destination.id }
        : linkField === "cost_center_id"
          ? { cost_center_id: destination.id }
          : { request_type: destination.id };
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
        qc.invalidateQueries({ queryKey: ["damage-reasons"] }),
        qc.invalidateQueries({ queryKey: ["approval-rules"] }),
        qc.invalidateQueries({ queryKey: ["unit-products"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const availableDestinations = destinations.filter((item) => {
    if (sourceEntityType === "project" && item.kind === "project" && item.id === entityId) return false;
    if (sourceEntityType === "client" && (item.kind === "client" && item.id === entityId || item.kind === "unit" && item.parentClientId === entityId)) return false;
    return !sourceEntityType ? item.id !== entityId : true;
  });
  const hasLinks = records.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="compactIcon" variant="ghost" title={`Excluir ${entityLabel}`} aria-label={`Excluir ${entityLabel}`} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
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
            {records.map((record) => {
              const recordType = "type" in record ? record.type : "";
              const recordDestinations = sourceEntityType === "client" && recordType === "project"
                ? availableDestinations.filter((item) => item.kind === "client" || item.kind === "unit")
                : sourceEntityType === "project" && (recordType === "unit_product" || recordType === "technician_move")
                  ? availableDestinations.filter((item) => item.kind === "project")
                  : availableDestinations;
              const groupedKinds: DestinationKind[] = ["project", "client", "unit"];
              return (
              <Collapsible key={record.key} open={expandedLinks[record.key] ?? false} onOpenChange={(expanded) => setExpandedLinks((current) => ({ ...current, [record.key]: expanded }))} className="border-b pb-3">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-medium">{record.label}</p>
                  <CollapsibleTrigger asChild>
                    <Button size="compactIcon" variant="ghost" aria-label={(expandedLinks[record.key] ?? false) ? `Recolher ${record.label}` : `Expandir ${record.label}`} title={(expandedLinks[record.key] ?? false) ? "Recolher" : "Expandir"}>
                      {(expandedLinks[record.key] ?? false) ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="pt-3">
                  <p className="mb-3 text-sm text-muted-foreground">{record.detail}</p>
                  <div className="grid gap-3 sm:grid-cols-[minmax(180px,1fr)_auto] sm:items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Novo destino</Label>
                      <Select value={targets[record.key] ?? ""} onValueChange={(value) => setTargets((current) => ({ ...current, [record.key]: value }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {sourceEntityType ? groupedKinds.map((kind, groupIndex) => {
                            const options = recordDestinations.filter((item) => item.kind === kind);
                            if (!options.length) return null;
                            return <SelectGroup key={kind}>
                              {groupIndex > 0 && <SelectSeparator />}
                              <SelectLabel>{kind === "project" ? "Projetos" : kind === "client" ? "Clientes" : "Unidades / Filiais"}</SelectLabel>
                              {options.map((item) => <SelectItem key={`${kind}:${item.id}`} value={`${kind}:${item.id}`}>{item.name}</SelectItem>)}
                            </SelectGroup>;
                          }) : recordDestinations.map((item) => <SelectItem key={item.id} value={`legacy:${item.id}`}>{item.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      disabled={!targets[record.key] || reallocate.isPending}
                      onClick={() => {
                         const destinationValue = targets[record.key];
                         if (destinationValue) reallocate.mutate({ recordKey: record.key, destinationValue });
                      }}
                    >
                      Realocar
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );})}
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