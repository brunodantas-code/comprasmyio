import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Factory, Pencil } from "lucide-react";

export const MYIO_PRODUCTS = [
  "Myio Switch normal",
  "Myio Switch normal c/ temp.",
  "Myio Switch 24v",
  "Myio Switch Hidrômetro",
  "Myio Sw 4-20ma Nível",
  "Myio Sw Reboot",
  "Myio 3F TC 50A",
  "Myio 3F TC 100A",
  "Myio 3F TC 400A",
  "Myio 3F TC 1000A",
  "Myio 3F TC 2000A",
  "Myio Central",
  "Myio Remote",
] as const;

type MyioStatus = "pendente" | "produzindo" | "pronto_entrega" | "entregue_cliente";

const STATUS_LABELS: Record<MyioStatus, string> = {
  pendente: "Pendente",
  produzindo: "Produzindo",
  pronto_entrega: "Pronto para entrega",
  entregue_cliente: "Entregue para o cliente",
};

const STATUS_CLASSES: Record<MyioStatus, string> = {
  pendente: "bg-yellow-100 text-yellow-800 border-yellow-300",
  produzindo: "bg-purple-100 text-purple-800 border-purple-300",
  pronto_entrega: "bg-green-100 text-green-800 border-green-300",
  entregue_cliente: "bg-blue-100 text-blue-800 border-blue-300",
};

type MyioOrder = {
  id: string;
  title: string;
  client_name: string;
  delivery_date: string;
  status: MyioStatus;
  notes: string | null;
  created_at: string;
  myio_order_items: { id: string; product: string; quantity: number }[];
};

function formatDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

function NewMyioOrderDialog({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState<Record<string, string>>({});

  const reset = () => {
    setTitle(""); setClient(""); setDate(""); setNotes(""); setQty({});
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const items = MYIO_PRODUCTS
        .map((p) => ({ product: p, quantity: parseInt(qty[p] ?? "", 10) }))
        .filter((i) => Number.isFinite(i.quantity) && i.quantity > 0);
      if (!date) throw new Error("Informe a data de entrega.");
      if (items.length === 0) throw new Error("Adicione a quantidade de pelo menos um produto.");

      const { data: order, error } = await supabase
        .from("myio_orders")
        .insert({ title, client_name: client, delivery_date: date, notes: notes || null, created_by: userId })
        .select("id")
        .single();
      if (error) throw error;

      const { error: itemsError } = await supabase
        .from("myio_order_items")
        .insert(items.map((i) => ({ ...i, order_id: order.id })));
      if (itemsError) throw itemsError;
    },
    onSuccess: () => {
      toast.success("Pedido criado.");
      qc.invalidateQueries({ queryKey: ["myio-orders"] });
      reset();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" />Novo pedido Myio</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo pedido de produtos Myio</DialogTitle>
          <DialogDescription>Defina a data de entrega e as quantidades por produto.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="myio-title">Identificação do pedido</Label>
            <Input id="myio-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Lote 42" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="myio-client">Cliente</Label>
            <Input id="myio-client" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="myio-date">Data de entrega</Label>
            <Input id="myio-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Produtos</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {MYIO_PRODUCTS.map((p) => (
              <div key={p} className="flex items-center justify-between gap-3 rounded-md border p-2">
                <span className="text-sm">{p}</span>
                <Input
                  type="number"
                  min={0}
                  className="w-20"
                  value={qty[p] ?? ""}
                  onChange={(e) => setQty((prev) => ({ ...prev, [p]: e.target.value }))}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="myio-notes">Observações</Label>
          <Textarea id="myio-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Criando..." : "Criar pedido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteMyioOrder({ id }: { id: string }) {
  return <DeleteMyioOrderInner id={id} />;
}

function EditMyioOrderDialog({ order }: { order: MyioOrder }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(order.title);
  const [client, setClient] = useState(order.client_name);
  const [date, setDate] = useState(order.delivery_date?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState(order.notes ?? "");
  const [qty, setQty] = useState<Record<string, string>>({});

  const load = () => {
    setTitle(order.title);
    setClient(order.client_name);
    setDate(order.delivery_date?.slice(0, 10) ?? "");
    setNotes(order.notes ?? "");
    const map: Record<string, string> = {};
    order.myio_order_items.forEach((i) => { map[i.product] = String(i.quantity); });
    setQty(map);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const items = MYIO_PRODUCTS
        .map((p) => ({ product: p, quantity: parseInt(qty[p] ?? "", 10) }))
        .filter((i) => Number.isFinite(i.quantity) && i.quantity > 0);
      if (!date) throw new Error("Informe a data de entrega.");
      if (items.length === 0) throw new Error("Adicione a quantidade de pelo menos um produto.");

      const { error } = await supabase
        .from("myio_orders")
        .update({ title, client_name: client, delivery_date: date, notes: notes || null })
        .eq("id", order.id);
      if (error) throw error;

      const { error: delError } = await supabase.from("myio_order_items").delete().eq("order_id", order.id);
      if (delError) throw delError;

      const { error: insError } = await supabase
        .from("myio_order_items")
        .insert(items.map((i) => ({ ...i, order_id: order.id })));
      if (insError) throw insError;
    },
    onSuccess: () => {
      toast.success("Pedido atualizado.");
      qc.invalidateQueries({ queryKey: ["myio-orders"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) load(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar pedido Myio</DialogTitle>
          <DialogDescription>Atualize os dados e as quantidades por produto.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`edit-title-${order.id}`}>Identificação do pedido</Label>
            <Input id={`edit-title-${order.id}`} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-client-${order.id}`}>Cliente</Label>
            <Input id={`edit-client-${order.id}`} value={client} onChange={(e) => setClient(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-date-${order.id}`}>Data de entrega</Label>
            <Input id={`edit-date-${order.id}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Produtos</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {MYIO_PRODUCTS.map((p) => (
              <div key={p} className="flex items-center justify-between gap-3 rounded-md border p-2">
                <span className="text-sm">{p}</span>
                <Input
                  type="number"
                  min={0}
                  className="w-20"
                  value={qty[p] ?? ""}
                  onChange={(e) => setQty((prev) => ({ ...prev, [p]: e.target.value }))}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`edit-notes-${order.id}`}>Observações</Label>
          <Textarea id={`edit-notes-${order.id}`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteMyioOrderInner({ id }: { id: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("myio_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido excluído.");
      qc.invalidateQueries({ queryKey: ["myio-orders"] });
      setOpen(false);
      setText("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir pedido</DialogTitle>
          <DialogDescription>Digite "excluir" para confirmar. Esta ação é definitiva.</DialogDescription>
        </DialogHeader>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder='digite "excluir"' />
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={text.trim().toLowerCase() !== "excluir" || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MyioOrdersTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["myio-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("myio_orders")
        .select("id, title, client_name, delivery_date, status, notes, created_at, myio_order_items(id, product, quantity)")
        .order("delivery_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as MyioOrder[];
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MyioStatus }) => {
      const { error } = await supabase.from("myio_orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado.");
      qc.invalidateQueries({ queryKey: ["myio-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = orders ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2"><Factory className="h-5 w-5" />Pedidos Produtos Myio</CardTitle>
          <CardDescription>Controle de produção e entrega dos produtos Myio.</CardDescription>
        </div>
        <NewMyioOrderDialog userId={userId} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum pedido cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">
                    {o.title || "—"}
                    {o.notes && <p className="text-xs text-muted-foreground">{o.notes}</p>}
                  </TableCell>
                  <TableCell>{o.client_name || "—"}</TableCell>
                  <TableCell>{formatDate(o.delivery_date)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {o.myio_order_items.map((i) => (
                        <div key={i.id} className="text-xs">
                          <span className="font-medium">{i.quantity}x</span> {i.product}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Badge variant="outline" className={STATUS_CLASSES[o.status]}>{STATUS_LABELS[o.status]}</Badge>
                      <Select value={o.status} onValueChange={(v) => statusMutation.mutate({ id: o.id, status: v as MyioStatus })}>
                        <SelectTrigger className="h-8 w-52"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(STATUS_LABELS) as MyioStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell><DeleteMyioOrder id={o.id} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}