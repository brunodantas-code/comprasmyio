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
import { Checkbox } from "@/components/ui/checkbox";
import { ProductImageUploader, ProductPhotoPreview, useProductImages } from "@/components/myio-product-image";
import { ItemDeliveriesDialog } from "@/components/myio-delivery-qr";
import { toast } from "sonner";
import { Plus, Trash2, Factory, Pencil, Check } from "lucide-react";

export const MYIO_PRODUCTS = [
  "Myio 3F",
  "Myio Switch Hidrômetro",
  "Myio Switch Normal",
  "Myio Switch Normal C/ Temp",
  "Myio Sw 4-20ma Nível",
  "Myio Sw Reboot",
  "Myio Switch 24V",
  "Myio Central",
  "Myio Remote",
  "Sensor 3D Plano Parafuso Akvometer",
  "Sensor 3D Vertical Hidrômetro",
  "Sensor Sirius ACB Mensolarb",
] as const;

type MyioStatus = "pendente" | "produzindo" | "pronto_entrega" | "em_transito" | "entregue_cliente" | "perdido";

const STATUS_LABELS: Record<MyioStatus, string> = {
  pendente: "Pendente",
  produzindo: "Produzindo",
  pronto_entrega: "Pronto para entrega",
  em_transito: "Transporte",
  entregue_cliente: "Entregue para o cliente",
  perdido: "Perdido",
};

const STATUS_CLASSES: Record<MyioStatus, string> = {
  pendente: "bg-yellow-100 text-yellow-800 border-yellow-300",
  produzindo: "bg-purple-100 text-purple-800 border-purple-300",
  pronto_entrega: "bg-green-100 text-green-800 border-green-300",
  em_transito: "bg-amber-100 text-amber-800 border-amber-300",
  entregue_cliente: "bg-blue-100 text-blue-800 border-blue-300",
  perdido: "bg-red-100 text-red-800 border-red-300",
};

const STATUS_KEYS = Object.keys(STATUS_LABELS) as MyioStatus[];

type MyioOrder = {
  id: string;
  title: string;
  client_name: string;
  delivery_date: string;
  status: MyioStatus;
  notes: string | null;
  created_at: string;
  project_id: string | null;
  is_replacement: boolean | null;
  projects: { name: string } | null;
  myio_order_items: { id: string; product: string; quantity: number }[];
};

function formatDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

function useProjects() {
  return useQuery({
    queryKey: ["projects-for-myio"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").neq("name", "Estoque").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useMyioProductOptions() {
  const { data } = useQuery({
    queryKey: ["myio-product-options"],
    queryFn: async () => {
      const [myio, terceiros] = await Promise.all([
        supabase.from("materials").select("name").eq("location", "almoxarifado").order("name"),
        supabase.from("terceiros_materials").select("name").order("name"),
      ]);
      if (myio.error) throw myio.error;
      if (terceiros.error) throw terceiros.error;
      return [...(myio.data ?? []), ...(terceiros.data ?? [])].map((m) => m.name);
    },
  });
  const seen = new Set<string>();
  const list: string[] = [];
  (data ?? []).forEach((n) => {
    const key = n.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    if (/ — Caixa de \d+$/.test(n)) return;
    seen.add(key);
    list.push(n);
  });
  return list;
}


function NewMyioOrderDialog({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: projects } = useProjects();
  const { data: images } = useProductImages();
  const products = useMyioProductOptions();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isReplacement, setIsReplacement] = useState(false);
  const [qty, setQty] = useState<Record<string, string>>({});

  const reset = () => {
    setProjectId(""); setDate(""); setNotes(""); setQty({}); setIsReplacement(false);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const items = products
        .map((p) => ({ product: p, quantity: parseInt(qty[p] ?? "", 10) }))
        .filter((i) => Number.isFinite(i.quantity) && i.quantity > 0);
      if (!date) throw new Error("Informe a data de entrega.");
      if (!projectId) throw new Error("Selecione um projeto.");
      if (items.length === 0) throw new Error("Adicione a quantidade de pelo menos um produto.");

      const { data: order, error } = await supabase
        .from("myio_orders")
        .insert({ project_id: projectId, delivery_date: date, notes: notes || null, created_by: userId, is_replacement: isReplacement })
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
          <DialogDescription>Selecione o projeto, a data de entrega e as quantidades por produto.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Projeto</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Selecione um projeto" /></SelectTrigger>
              <SelectContent>
                {(projects ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="myio-date">Data de entrega</Label>
            <Input id="myio-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-md border p-3">
          <Checkbox id="myio-replacement" checked={isReplacement} onCheckedChange={(v) => setIsReplacement(v === true)} />
          <Label htmlFor="myio-replacement" className="cursor-pointer font-normal">Produto de reposição</Label>
        </div>

        <div className="space-y-2">
          <Label>Produtos</Label>
          <p className="text-xs text-muted-foreground">Clique na miniatura para adicionar ou trocar a foto do produto.</p>
          <div className="grid gap-2 [&>*]:min-w-0 sm:grid-cols-2">
            {products.map((p) => (
              <div key={p} className="flex items-center justify-between gap-3 rounded-md border p-2">
                <div className="flex min-w-0 items-center gap-2">
                  <ProductImageUploader product={p} url={images?.[p]} userId={userId} />
                  <ProductPhotoPreview product={p} url={images?.[p]} size={0}>
                    <span className="text-sm">{p}</span>
                  </ProductPhotoPreview>
                </div>
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

function EditMyioOrderDialog({ order, userId }: { order: MyioOrder; userId: string }) {
  const qc = useQueryClient();
  const { data: projects } = useProjects();
  const { data: images } = useProductImages();
  const products = useMyioProductOptions();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState(order.project_id ?? "");
  const [date, setDate] = useState(order.delivery_date?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState(order.notes ?? "");
  const [isReplacement, setIsReplacement] = useState(!!order.is_replacement);
  const [qty, setQty] = useState<Record<string, string>>({});

  const load = () => {
    setProjectId(order.project_id ?? "");
    setDate(order.delivery_date?.slice(0, 10) ?? "");
    setNotes(order.notes ?? "");
    setIsReplacement(!!order.is_replacement);
    const map: Record<string, string> = {};
    order.myio_order_items.forEach((i) => { map[i.product] = String(i.quantity); });
    setQty(map);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const items = products
        .map((p) => ({ product: p, quantity: parseInt(qty[p] ?? "", 10) }))
        .filter((i) => Number.isFinite(i.quantity) && i.quantity > 0);
      if (!date) throw new Error("Informe a data de entrega.");
      if (!projectId) throw new Error("Selecione um projeto.");
      if (items.length === 0) throw new Error("Adicione a quantidade de pelo menos um produto.");

      const { error } = await supabase
        .from("myio_orders")
        .update({ project_id: projectId, delivery_date: date, notes: notes || null, is_replacement: isReplacement })
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

        <div className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Projeto</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Selecione um projeto" /></SelectTrigger>
              <SelectContent>
                {(projects ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-date-${order.id}`}>Data de entrega</Label>
            <Input id={`edit-date-${order.id}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-md border p-3">
          <Checkbox
            id={`edit-replacement-${order.id}`}
            checked={isReplacement}
            onCheckedChange={(v) => setIsReplacement(v === true)}
          />
          <Label htmlFor={`edit-replacement-${order.id}`} className="cursor-pointer font-normal">Produto de reposição</Label>
        </div>

        <div className="space-y-2">
          <Label>Produtos</Label>
          <div className="grid gap-2 [&>*]:min-w-0 sm:grid-cols-2">
            {products.map((p) => (
              <div key={p} className="flex items-center justify-between gap-3 rounded-md border p-2">
                <div className="flex min-w-0 items-center gap-2">
                  <ProductImageUploader product={p} url={images?.[p]} userId={userId} />
                  <ProductPhotoPreview product={p} url={images?.[p]} size={0}>
                    <span className="text-sm">{p}</span>
                  </ProductPhotoPreview>
                </div>
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

export function MyioOrdersTab({ userId, canManage = true }: { userId: string; canManage?: boolean }) {
  const qc = useQueryClient();
  const { data: images } = useProductImages();
  const [statusFilter, setStatusFilter] = useState<Set<MyioStatus>>(
    new Set(Object.keys(STATUS_LABELS) as MyioStatus[])
  );
  const { data: deliveredItemIds } = useQuery({
    queryKey: ["myio-item-deliveries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("myio_item_deliveries").select("order_item_id");
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.order_item_id));
    },
  });
  const { data: orders, isLoading } = useQuery({
    queryKey: ["myio-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("myio_orders")
        .select("id, title, client_name, delivery_date, status, notes, created_at, project_id, is_replacement, projects(name), myio_order_items(id, product, quantity)")
        .order("delivery_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as MyioOrder[];
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MyioStatus }) => {
      const { error } = await supabase.from("myio_orders").update({ status: status as never }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado.");
      qc.invalidateQueries({ queryKey: ["myio-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = (orders ?? []).filter((o) => statusFilter.has(o.status));

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2"><Factory className="h-5 w-5 shrink-0" />Solicitações de Projetos</CardTitle>
          <CardDescription>Controle de produção e entrega dos produtos Myio.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter.size === STATUS_KEYS.length ? "all" : (Array.from(statusFilter)[0] ?? "all")}
            onValueChange={(v) => {
              if (v === "all") {
                setStatusFilter(new Set(STATUS_KEYS));
              } else {
                setStatusFilter(new Set([v as MyioStatus]));
              }
            }}
          >
            <SelectTrigger className="h-9 w-full sm:w-52"><SelectValue placeholder="Filtrar status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUS_KEYS.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManage && <NewMyioOrderDialog userId={userId} />}
        </div>
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
                <TableHead>Projeto</TableHead>
                <TableHead>Reposição</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">
                    {o.projects?.name || "—"}
                    {o.notes && <p className="text-xs text-muted-foreground">{o.notes}</p>}
                  </TableCell>
                  <TableCell>
                    {o.is_replacement ? (
                      <Badge variant="outline" className="border-orange-300 bg-orange-100 text-orange-800">Sim</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Não</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(o.delivery_date)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {o.myio_order_items.map((i) => (
                        <div key={i.id} className="flex items-center gap-2 text-xs">
                          <ProductPhotoPreview product={i.product} url={images?.[i.product]} size={28}>
                            <span><span className="font-medium">{i.quantity}x</span> {i.product}</span>
                          </ProductPhotoPreview>
                          {deliveredItemIds?.has(i.id) && (
                            <ItemDeliveriesDialog
                              orderItemId={i.id}
                              product={i.product}
                              trigger={
                                <span
                                  className="inline-flex items-center rounded p-0.5 hover:bg-muted"
                                  title="Ver QR codes e fotos vinculados"
                                >
                                  <Check className="h-4 w-4 shrink-0 text-green-600" aria-label="Baixa registrada" />
                                </span>
                              }
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Badge variant="outline" className={STATUS_CLASSES[o.status]}>{STATUS_LABELS[o.status]}</Badge>
                      {canManage && (
                      <Select value={o.status} onValueChange={(v) => statusMutation.mutate({ id: o.id, status: v as MyioStatus })}>
                        <SelectTrigger className="h-8 w-52"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(STATUS_LABELS) as MyioStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      )}
                    </div>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <EditMyioOrderDialog order={o} userId={userId} />
                        <DeleteMyioOrder id={o.id} />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}