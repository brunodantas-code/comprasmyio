import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type LinkField = "project_id" | "client_id" | "cost_center_id" | "request_type";
type Destination = { id: string; name: string };

type LinkedOrder = {
  id: string;
  approval_number: string | null;
  item_name: string;
};

export function LinkedRecordDeletionDialog({
  entityId,
  entityName,
  entityLabel,
  linkField,
  destinations,
  onDelete,
  deleting,
}: {
  entityId: string;
  entityName: string;
  entityLabel: string;
  linkField: LinkField;
  destinations: Destination[];
  onDelete: () => void;
  deleting?: boolean;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [targets, setTargets] = useState<Record<string, string>>({});
  const queryKey = ["linked-orders", linkField, entityId];
  const { data: orders = [], isLoading } = useQuery({
    queryKey,
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("id,approval_number,item_name")
        .eq(linkField, entityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LinkedOrder[];
    },
  });

  useEffect(() => {
    if (!open) setTargets({});
  }, [open]);

  const reallocate = useMutation({
    mutationFn: async ({ orderId, destinationId }: { orderId: string; destinationId: string }) => {
      const values = linkField === "project_id"
        ? { project_id: destinationId }
        : linkField === "client_id"
          ? { client_id: destinationId }
          : linkField === "cost_center_id"
            ? { cost_center_id: destinationId }
            : { request_type: destinationId };
      const { error } = await supabase.from("purchase_orders").update(values).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: async (_, variables) => {
      toast.success("Solicitação realocada");
      setTargets((current) => {
        const next = { ...current };
        delete next[variables.orderId];
        return next;
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey }),
        qc.invalidateQueries({ queryKey: ["project-budget-summaries"] }),
        qc.invalidateQueries({ queryKey: ["orders"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const availableDestinations = destinations.filter((item) => item.id !== entityId);
  const hasLinks = orders.length > 0;

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
            {isLoading
              ? "Verificando solicitações vinculadas..."
              : hasLinks
                ? `${orders.length} solicitação(ões) está(ão) vinculada(s) a “${entityName}”. Realoque cada uma antes de excluir.`
                : `Confirma a exclusão de “${entityName}”?`}
          </DialogDescription>
        </DialogHeader>

        {hasLinks && (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="grid gap-3 border-b pb-3 sm:grid-cols-[minmax(0,1fr)_minmax(180px,1fr)_auto] sm:items-end">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{order.approval_number || "Sem número"}</p>
                  <p className="truncate text-sm text-muted-foreground">{order.item_name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Novo {entityLabel}</Label>
                  <Select value={targets[order.id] ?? ""} onValueChange={(value) => setTargets((current) => ({ ...current, [order.id]: value }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {availableDestinations.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  disabled={!targets[order.id] || reallocate.isPending}
                  onClick={() => {
                    const destinationId = targets[order.id];
                    if (destinationId) reallocate.mutate({ orderId: order.id, destinationId });
                  }}
                >
                  Realocar
                </Button>
              </div>
            ))}
            {!availableDestinations.length && <p className="text-sm text-destructive">Cadastre outro {entityLabel} para realizar a realocação.</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={isLoading || hasLinks || deleting}
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