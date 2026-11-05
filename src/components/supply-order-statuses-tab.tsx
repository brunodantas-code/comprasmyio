import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useCanManageSupplyTags } from "@/components/supply-tags-tab";

export type OrderStatusRow = { id: string; system_code: string | null; label: string; position: number; active: boolean; created_by: string | null; created_at: string };

export function useOrderStatuses() {
  return useQuery({
    queryKey: ["supply_order_statuses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("supply_order_statuses").select("id,system_code,label,position,active,created_by,created_at").order("position").order("label");
      if (error) throw error;
      return data as OrderStatusRow[];
    },
    staleTime: 60_000,
  });
}

const LABEL_MAX = 40;

export function SupplyOrderStatusesTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: rows, isLoading } = useOrderStatuses();
  const { data: canManage } = useCanManageSupplyTags(userId);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["supply_order_statuses"] }); qc.invalidateQueries({ queryKey: ["orders"] }); };

  const save = useMutation({
    mutationFn: async (v: { id?: string; label: string; position: number; active?: boolean }) => {
      const { error } = v.id
        ? await supabase.from("supply_order_statuses").update({ label: v.label, position: v.position, ...(v.active === undefined ? {} : { active: v.active }) }).eq("id", v.id)
        : await supabase.from("supply_order_statuses").insert({ label: v.label, position: v.position, created_by: userId });
      if (error) throw new Error(error.code === "23505" ? "Já existe uma situação com esse nome" : error.message);
    },
    onSuccess: () => { toast.success("Situação salva"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = useMutation({
    mutationFn: async ({ index, dir }: { index: number; dir: -1 | 1 }) => {
      const list = [...(rows ?? [])];
      const j = index + dir;
      if (j < 0 || j >= list.length) return;
      [list[index], list[j]] = [list[j], list[index]];
      for (let i = 0; i < list.length; i++) {
        const pos = (i + 1) * 10;
        if (list[i].position !== pos) {
          const { error } = await supabase.from("supply_order_statuses").update({ position: pos }).eq("id", list[i].id);
          if (error) throw error;
        }
      }
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (row: OrderStatusRow) => {
      const { count } = await supabase.from("purchase_orders").select("id", { count: "exact", head: true }).eq("custom_status_id", row.id);
      if (count) {
        const { error } = await supabase.from("supply_order_statuses").update({ active: false }).eq("id", row.id);
        if (error) throw error;
        return "Situação em uso: foi inativada e preservada nas solicitações";
      }
      const { error } = await supabase.from("supply_order_statuses").delete().eq("id", row.id);
      if (error) throw error;
      return "Situação excluída";
    },
    onSuccess: (msg) => { toast.success(msg); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>Status das Solicitações</CardTitle>
        {canManage && <StatusDialog onSave={(v) => save.mutate(v)} />}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          A sequência define a ordem em que as situações aparecem nas listas e filtros (use as setas para mudar). Situações originais podem ser renomeadas, mantendo suas regras (ex.: Conforme dá entrada no estoque). Situações novas servem só para acompanhamento.
          {canManage ? "" : " Somente Admin, Financeiro e Compras alteram esta lista."}
        </p>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Sequência</TableHead><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Situação</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {(rows ?? []).map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    <span className="inline-block w-5">{i + 1}</span>
                    {canManage && <>
                      <Button size="compactIcon" variant="ghost" title="Subir" aria-label="Subir" disabled={i === 0 || move.isPending} onClick={() => move.mutate({ index: i, dir: -1 })}><ArrowUp className="h-3.5 w-3.5" /></Button>
                      <Button size="compactIcon" variant="ghost" title="Descer" aria-label="Descer" disabled={i === (rows?.length ?? 0) - 1 || move.isPending} onClick={() => move.mutate({ index: i, dir: 1 })}><ArrowDown className="h-3.5 w-3.5" /></Button>
                    </>}
                  </TableCell>
                  <TableCell className="font-medium">{r.label}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.system_code ? "Original (com regras)" : "Acompanhamento"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.active ? "Ativa" : "Inativa"}</TableCell>
                  <TableCell className="space-x-1 whitespace-nowrap text-right">
                    {canManage && <>
                      <StatusDialog row={r} onSave={(v) => save.mutate({ ...v, id: r.id })} />
                      {!r.system_code && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="compactIcon" variant="ghost" title="Excluir" aria-label="Excluir"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Excluir situação?</AlertDialogTitle><AlertDialogDescription>Se “{r.label}” estiver em uso, ela será inativada para preservar as solicitações.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(r)}>Excluir</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function StatusDialog({ row, onSave }: { row?: OrderStatusRow; onSave: (v: { label: string; position: number; active?: boolean }) => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(row?.label ?? "");
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setLabel(row?.label ?? ""); }}>
      <DialogTrigger asChild>
        {row ? <Button size="compactIcon" variant="ghost" title="Editar" aria-label="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
          : <Button size="compactIcon" variant="action" title="Nova situação" aria-label="Nova situação"><Plus className="h-3.5 w-3.5" /></Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{row ? "Editar situação" : "Nova situação"}</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const name = label.trim();
          if (name.length < 2) return toast.error("Nome muito curto");
          onSave({ label: name, position: row?.position ?? 1000, active: row && !row.system_code ? fd.get("active") === "on" : undefined });
          setOpen(false);
        }}>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={LABEL_MAX} placeholder="Ex.: Em cotação" required />
            <p className="text-right text-xs text-muted-foreground">{label.length}/{LABEL_MAX}</p>
          </div>
          {row && !row.system_code && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={row.active} /> Ativa</label>}
          <DialogFooter><Button type="submit" variant="action">Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
