import { CdeButton } from "@/components/cde/cde-button";
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
import { ChevronDown, ChevronUp, GripVertical, Pencil, Trash2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

  const [expanded, setExpanded] = useState(false);
  const [localOrder, setLocalOrder] = useState<OrderStatusRow[] | null>(null);
  const list = localOrder ?? rows ?? [];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const reorder = useMutation({
    mutationFn: async (next: OrderStatusRow[]) => {
      for (let i = 0; i < next.length; i++) {
        const pos = (i + 1) * 10;
        if (next[i].position !== pos) {
          const { error } = await supabase.from("supply_order_statuses").update({ position: pos }).eq("id", next[i].id);
          if (error) throw error;
        }
      }
    },
    onSettled: async () => { await qc.invalidateQueries({ queryKey: ["supply_order_statuses"] }); setLocalOrder(null); },
    onError: (e: Error) => toast.error(e.message),
  });
  const onDragEnd = (e: DragEndEvent) => {
    if (!canManage || !e.over || e.active.id === e.over.id) return;
    const from = list.findIndex((r) => r.id === e.active.id), to = list.findIndex((r) => r.id === e.over!.id);
    const next = arrayMove(list, from, to);
    setLocalOrder(next); reorder.mutate(next);
  };

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
    <Collapsible open={expanded} onOpenChange={setExpanded} asChild><Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>Status das Solicitações</CardTitle>
        <div className="flex items-center gap-1">
          {canManage && <StatusDialog onSave={(v) => save.mutate(v)} />}
          <CollapsibleTrigger asChild><Button size="compactIcon" variant="ghost" aria-label={expanded ? "Recolher Status das Solicitações" : "Expandir Status das Solicitações"}>{expanded ? <ChevronUp /> : <ChevronDown />}</Button></CollapsibleTrigger>
        </div>
      </CardHeader>
      <CollapsibleContent asChild><CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          A sequência define a ordem em que as situações aparecem nas listas e filtros (arraste pela alça para mudar; a numeração se ajusta sozinha). Situações originais podem ser renomeadas, mantendo suas regras (ex.: Conforme dá entrada no estoque). Situações novas servem só para acompanhamento.
          {canManage ? "" : " Somente Admin, Financeiro e Compras alteram esta lista."}
        </p>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Sequência</TableHead><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Situação</TableHead><TableHead /></TableRow></TableHeader>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={list.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <TableBody className="[&_tr:last-child]:border-b">
              {list.map((r, i) => (
                <SortableStatusRow key={r.id} row={r} index={i} canManage={!!canManage} onSave={(v) => save.mutate({ ...v, id: r.id })} onRemove={() => remove.mutate(r)} />
              ))}
            </TableBody>
            </SortableContext>
            </DndContext>
            <TableBody>
              {["Aguardando aprovação", "Rejeitado"].map((label) => (
                <TableRow key={label}>
                  <TableCell className="text-sm text-muted-foreground">—</TableCell>
                  <TableCell className="font-medium">{label}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">Automática (fluxo de aprovação)</TableCell>
                  <TableCell className="text-sm text-muted-foreground">Ativa</TableCell>
                  <TableCell />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></CollapsibleContent>
    </Card></Collapsible>
  );
}

function StatusDialog({ row, onSave }: { row?: OrderStatusRow; onSave: (v: { label: string; position: number; active?: boolean }) => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(row?.label ?? "");
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setLabel(row?.label ?? ""); }}>
      <DialogTrigger asChild>
        {row ? <Button size="compactIcon" variant="ghost" title="Editar" aria-label="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
          : <CdeButton group="plus" screen="components/supply-order-statuses-tab.tsx" title="Nova situação" aria-label="Nova situação"></CdeButton>}
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

function SortableStatusRow({ row, index, canManage, onSave, onRemove }: { row: OrderStatusRow; index: number; canManage: boolean; onSave: (v: { label: string; position: number; active?: boolean }) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id, disabled: !canManage });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? "relative z-10 bg-muted" : undefined}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      {canManage && <button type="button" {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing" aria-label="Arrastar para reordenar"><GripVertical className="h-4 w-4" /></button>}
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-border px-1 text-xs">{index + 1}</span>
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.system_code ? "Original (com regras)" : "Acompanhamento"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.active ? "Ativa" : "Inativa"}</TableCell>
                  <TableCell className="space-x-1 whitespace-nowrap text-right">
                    {canManage && <>
                      <StatusDialog row={row} onSave={(v) => onSave(v)} />
                      {!row.system_code && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="compactIcon" variant="ghost" title="Excluir" aria-label="Excluir"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Excluir situação?</AlertDialogTitle><AlertDialogDescription>Se “{row.label}” estiver em uso, ela será inativada para preservar as solicitações.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => onRemove()}>Excluir</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </>}
                  </TableCell>
                </TableRow>
  );
}
