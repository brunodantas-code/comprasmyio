import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Factory, Loader2, ShoppingCart, Wand2 } from "lucide-react";
import { toast } from "sonner";

type DemandItem = { id: string; product: string; quantity: number };

type ItemDialogState = {
  order: DemandOrder;
  item: DemandItem;
  missing: number;
  isManufactured: boolean;
};

function ResolveItemDialog({
  state,
  onClose,
  onConfirm,
  pending,
}: {
  state: ItemDialogState | null;
  onClose: () => void;
  onConfirm: (mode: "produce" | "buy", quantity: number) => void;
  pending: boolean;
}) {
  const [qty, setQty] = useState(1);
  return (
    <Dialog
      open={!!state}
      onOpenChange={(o) => {
        if (!o) onClose();
        else if (state) setQty(state.missing);
      }}
    >
      <DialogContent
        onOpenAutoFocus={() => {
          if (state) setQty(state.missing);
        }}
      >
        <DialogHeader>
          <DialogTitle>Resolver item</DialogTitle>
          <DialogDescription>
            {state?.item.product} — faltam {state?.missing} unidade(s).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="resolve-qty">Quantidade</Label>
          <Input
            id="resolve-qty"
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          {state?.isManufactured ? (
            <Button variant="outline" disabled={pending} onClick={() => onConfirm("produce", qty)}>
              <Factory className="mr-2 h-4 w-4" />
              Produzir
            </Button>
          ) : (
            <Button disabled={pending} onClick={() => onConfirm("buy", qty)}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Comprar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type DemandOrder = {
  id: string;
  delivery_date: string;
  status: string;
  notes: string | null;
  is_replacement: boolean | null;
  project_id: string | null;
  projects: { name: string } | null;
  myio_order_items: { id: string; product: string; quantity: number }[];
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  produzindo: "Produzindo",
  pronto_entrega: "Pronto para entrega",
  entregue_cliente: "Entregue para o cliente",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

export function MyioDemandCard({ balances }: { balances: Record<string, number> }) {
  const queryClient = useQueryClient();
  const [itemDialog, setItemDialog] = useState<ItemDialogState | null>(null);
  const { data: orders, isLoading } = useQuery({
    queryKey: ["myio-demand"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("myio_orders")
        .select("id, delivery_date, status, notes, is_replacement, project_id, projects(name), myio_order_items(id, product, quantity)")
        .neq("status", "entregue_cliente")
        .order("delivery_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as DemandOrder[];
    },
  });

  const list = (orders ?? []).filter((o) => o.myio_order_items.length > 0);

  const { data: materials } = useQuery({
    queryKey: ["manufactured-material-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id, name, link, is_product, is_manufactured");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string; link: string | null; is_product: boolean | null; is_manufactured: boolean | null }[];
    },
  });

  const manufacturedNames = new Set(
    (materials ?? [])
      .filter((m) => m.is_product && m.is_manufactured !== false)
      .map((m) => m.name.trim().toLowerCase()),
  );
  const materialByName = new Map((materials ?? []).map((m) => [m.name.trim().toLowerCase(), m]));

  const { data: resolvedItemIds } = useQuery({
    queryKey: ["demand-resolved-items"],
    queryFn: async () => {
      const [prod, buy] = await Promise.all([
        supabase.from("production_demands").select("order_item_id"),
        supabase.from("purchase_demands").select("order_item_id"),
      ]);
      if (prod.error) throw prod.error;
      if (buy.error) throw buy.error;
      return new Set(
        [...(prod.data ?? []), ...(buy.data ?? [])]
          .map((r) => r.order_item_id)
          .filter(Boolean) as string[],
      );
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (vars: {
      order: DemandOrder;
      items?: DemandItem[];
      mode?: "produce" | "buy";
      quantity?: number;
    }) => {
      const { order, mode } = vars;
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;

      const source = vars.items ?? order.myio_order_items;
      const pending = source.filter((i) => {
        const bal = balances[i.product.trim().toLowerCase()] ?? 0;
        return i.quantity - bal > 0 && !(resolvedItemIds?.has(i.id) ?? false);
      });
      if (pending.length === 0) return { produce: 0, buy: 0 };

      const isProduce = (i: DemandItem) =>
        mode ? mode === "produce" : manufacturedNames.has(i.product.trim().toLowerCase());
      const toProduce = pending.filter(isProduce);
      const toBuy = pending.filter((i) => !isProduce(i));
      const missing = (i: { product: string; quantity: number }) =>
        vars.quantity ?? i.quantity - (balances[i.product.trim().toLowerCase()] ?? 0);

      if (toProduce.length) {
        const { error } = await supabase.from("production_demands").insert(
          toProduce.map((i) => ({
            order_item_id: i.id,
            order_id: order.id,
            product: i.product,
            quantity: missing(i),
            created_by: userId,
          })),
        );
        if (error) throw error;
      }

      if (toBuy.length) {
        if (!order.project_id) {
          throw new Error("Este pedido Myio não está vinculado a um projeto — associe um projeto para enviar à fila de compras.");
        }
        if (!userId) throw new Error("Sessão expirada.");
        const created: { id: string; item: typeof toBuy[number] }[] = [];
        for (const i of toBuy) {
          const mat = materialByName.get(i.product.trim().toLowerCase());
          const { data, error } = await supabase
            .from("purchase_orders")
            .insert({
              project_id: order.project_id,
              requester_id: userId,
              item_name: i.product,
              item_link: mat?.link ?? null,
              material_id: mat?.id ?? null,
              quantity: missing(i),
              recipient: "Almoxarifado",
              delivery_point: "Almoxarifado",
              deadline_type: "customizado" as const,
              deadline_date: order.delivery_date,
              requester_notes: `Demanda automática do pedido Myio (${order.projects?.name ?? "sem projeto"}) — entrega ${formatDate(order.delivery_date)}.`,
            })
            .select("id")
            .single();
          if (error) throw error;
          created.push({ id: data.id, item: i });
        }
        const { error: pdErr } = await supabase.from("purchase_demands").insert(
          created.map((c) => ({
            order_item_id: c.item.id,
            order_id: order.id,
            purchase_order_id: c.id,
            product: c.item.product,
            quantity: missing(c.item),
            created_by: userId,
          })),
        );
        if (pdErr) throw pdErr;
      }

      return { produce: toProduce.length, buy: toBuy.length };
    },
    onSuccess: (r) => {
      if (r.produce === 0 && r.buy === 0) {
        toast.info("Nada pendente para resolver neste pedido.");
      } else {
        toast.success(`${r.buy} item(ns) na fila de compras e ${r.produce} item(ns) na fila de produção.`);
      }
      queryClient.invalidateQueries({ queryKey: ["demand-resolved-items"] });
      queryClient.invalidateQueries({ queryKey: ["production-demands"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao resolver demanda"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Demanda dos pedidos Myio
        </CardTitle>
        <CardDescription>
          Materiais exigidos por projeto, em ordem de data de entrega. Dê baixa no estoque conforme separar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma demanda pendente.</p>
        ) : (
          list.map((o) => (
            <div key={o.id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{o.projects?.name || "Sem projeto"}</span>
                <Badge variant="outline">Entrega {formatDate(o.delivery_date)}</Badge>
                <Badge variant="secondary">{STATUS_LABELS[o.status] ?? o.status}</Badge>
                {o.is_replacement && (
                  <Badge variant="outline" className="border-orange-300 bg-orange-100 text-orange-800">Reposição</Badge>
                )}
                <Button
                  size="sm"
                  className="ml-auto"
                  disabled={resolveMutation.isPending}
                  onClick={() => resolveMutation.mutate({ order: o })}
                >
                  {resolveMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  Resolver
                </Button>
              </div>
              {o.notes && <p className="text-xs text-muted-foreground">{o.notes}</p>}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="w-28">Exigido</TableHead>
                    <TableHead className="w-32">Em estoque</TableHead>
                    <TableHead className="w-32">Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {o.myio_order_items.map((i) => {
                    const bal = balances[i.product.trim().toLowerCase()] ?? 0;
                    const ok = bal >= i.quantity;
                    const isManufactured = manufacturedNames.has(i.product.trim().toLowerCase());
                    const sent = resolvedItemIds?.has(i.id) ?? false;
                    return (
                      <TableRow key={i.id}>
                        <TableCell>{i.product}</TableCell>
                        <TableCell className="font-medium">{i.quantity}</TableCell>
                        <TableCell>{bal}</TableCell>
                        <TableCell>
                          {ok ? (
                            <Badge variant="outline" className="border-green-300 bg-green-100 text-green-800">Disponível</Badge>
                          ) : sent ? (
                            <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-700">
                              {isManufactured ? "Enviado à fábrica" : "Na fila de compras"}
                            </Badge>
                          ) : (
                            <button
                              type="button"
                              className="cursor-pointer"
                              onClick={() => setItemDialog({ order: o, item: i, missing: i.quantity - bal, isManufactured })}
                            >
                              <Badge
                                variant="outline"
                                className={
                                  isManufactured
                                    ? "border-blue-300 bg-blue-100 text-blue-800 hover:bg-blue-200"
                                    : "border-red-300 bg-red-100 text-red-800 hover:bg-red-200"
                                }
                              >
                                {isManufactured ? "Produzir" : "Faltam"} {i.quantity - bal}
                              </Badge>
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ))
        )}
      </CardContent>
      <ResolveItemDialog
        state={itemDialog}
        onClose={() => setItemDialog(null)}
        pending={resolveMutation.isPending}
        onConfirm={(mode, quantity) => {
          if (!itemDialog) return;
          resolveMutation.mutate(
            { order: itemDialog.order, items: [itemDialog.item], mode, quantity },
            { onSettled: () => setItemDialog(null) },
          );
        }}
      />
    </Card>
  );
}

export function ProductionQueueCard({ balances }: { balances?: Record<string, number> }) {
  const queryClient = useQueryClient();
  const syncingRef = useRef(false);
  const { data: rows, isLoading } = useQuery({
    queryKey: ["production-demands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_demands")
        .select("id, product, quantity, status, created_at, order_id, myio_orders(delivery_date, projects(name))")
        .eq("status", "pendente")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as {
        id: string;
        product: string;
        quantity: number;
        myio_orders: { delivery_date: string; projects: { name: string } | null } | null;
      }[];
    },
  });

  // Conclui automaticamente as demandas já cobertas pelo estoque do almoxarifado.
  // Quando o saldo atinge a quantidade exigida, a demanda é zerada e sai da fila.
  const autoSync = useMutation({
    mutationFn: async (ops: { conclude: string[]; reduce: { id: string; qty: number }[] }) => {
      if (ops.conclude.length) {
        const { error } = await supabase
          .from("production_demands")
          .update({ status: "concluido" })
          .in("id", ops.conclude);
        if (error) throw error;
      }
      for (const r of ops.reduce) {
        const { error } = await supabase
          .from("production_demands")
          .update({ quantity: r.qty })
          .eq("id", r.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-demands"] });
      queryClient.invalidateQueries({ queryKey: ["demand-resolved-items"] });
    },
    onSettled: () => {
      syncingRef.current = false;
    },
  });

  useEffect(() => {
    if (syncingRef.current || !rows || !balances) return;
    const byProduct = new Map<string, typeof rows>();
    rows.forEach((r) => {
      const key = r.product.trim().toLowerCase();
      byProduct.set(key, [...(byProduct.get(key) ?? []), r]);
    });
    const conclude: string[] = [];
    const reduce: { id: string; qty: number }[] = [];
    for (const [key, demands] of byProduct) {
      let available = balances[key] ?? 0;
      if (available <= 0) continue;
      for (const d of demands) {
        if (available <= 0) break;
        if (d.quantity <= available) {
          conclude.push(d.id);
          available -= d.quantity;
        } else {
          reduce.push({ id: d.id, qty: d.quantity - available });
          available = 0;
        }
      }
    }
    if (!conclude.length && !reduce.length) return;
    syncingRef.current = true;
    autoSync.mutate({ conclude, reduce });
  }, [rows, balances, autoSync]);

  const grouped = new Map<string, { product: string; total: number; ids: string[]; projects: string[] }>();
  (rows ?? []).forEach((r) => {
    const key = r.product.trim().toLowerCase();
    const g = grouped.get(key) ?? { product: r.product, total: 0, ids: [], projects: [] };
    g.total += r.quantity;
    g.ids.push(r.id);
    const p = r.myio_orders?.projects?.name;
    if (p && !g.projects.includes(p)) g.projects.push(p);
    grouped.set(key, g);
  });
  const list = [...grouped.values()].sort((a, b) => b.total - a.total);

  const done = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("production_demands").update({ status: "concluido" }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demanda de produção concluída.");
      queryClient.invalidateQueries({ queryKey: ["production-demands"] });
      queryClient.invalidateQueries({ queryKey: ["demand-resolved-items"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Factory className="h-5 w-5" />
          Fila de produção
        </CardTitle>
        <CardDescription>
          Produtos que precisam ser fabricados, somados conforme a demanda dos pedidos Myio chega. Quando o
          estoque do almoxarifado atinge a quantidade exigida, a demanda é concluída automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma produção pendente.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="w-32">A produzir</TableHead>
                <TableHead>Projetos</TableHead>
                <TableHead className="w-32">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((g) => {
                const bal = balances?.[g.product.trim().toLowerCase()] ?? 0;
                return (
                  <TableRow key={g.product}>
                    <TableCell>{g.product}</TableCell>
                    <TableCell className="font-semibold">
                      {g.total}
                      {bal > 0 && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          (estoque: {bal})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{g.projects.join(", ") || "—"}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" disabled={done.isPending} onClick={() => done.mutate(g.ids)}>
                        Concluir
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
