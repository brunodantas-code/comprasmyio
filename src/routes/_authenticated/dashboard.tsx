import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, type AppRole } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Package, LogOut, Plus, ExternalLink, ClipboardList, ShoppingCart, FolderKanban, Users, ScrollText } from "lucide-react";
import { Trash2 } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Order = {
  id: string;
  project_id: string;
  requester_id: string;
  item_name: string;
  item_link: string | null;
  quantity: number;
  recipient: string;
  requester_notes: string | null;
  delivery_point: string;
  status: "pendente" | "comprado" | "aguardando" | "a_caminho" | "cancelado" | "entregue";
  buyer_notes: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_LABELS: Record<Order["status"], string> = {
  pendente: "Pendente",
  comprado: "Comprado",
  aguardando: "Aguardando",
  a_caminho: "A caminho",
  cancelado: "Cancelado",
  entregue: "Entregue",
};

const STATUS_VARIANT: Record<Order["status"], "default" | "secondary" | "destructive" | "outline"> = {
  pendente: "outline",
  comprado: "secondary",
  aguardando: "secondary",
  a_caminho: "default",
  cancelado: "destructive",
  entregue: "default",
};

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me, isLoading: meLoading } = useCurrentUser();

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (meLoading || !me) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  const defaultTab = me.isComprador ? "queue" : me.isAdmin ? "queue" : "mine";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Package className="h-5 w-5 text-primary" />
            ComprAqui
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium">{me.full_name || me.email}</div>
              <div className="flex justify-end gap-1">
                {me.roles.map((r) => (
                  <Badge key={r} variant="outline" className="text-[10px] uppercase">{r}</Badge>
                ))}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="mine"><ClipboardList className="mr-2 h-4 w-4" />Meus pedidos</TabsTrigger>
            <TabsTrigger value="new"><Plus className="mr-2 h-4 w-4" />Novo pedido</TabsTrigger>
            {(me.isComprador || me.isAdmin) && (
              <TabsTrigger value="queue"><ShoppingCart className="mr-2 h-4 w-4" />Fila de compras</TabsTrigger>
            )}
            {me.isAdmin && <TabsTrigger value="projects"><FolderKanban className="mr-2 h-4 w-4" />Projetos</TabsTrigger>}
            {me.isAdmin && <TabsTrigger value="users"><Users className="mr-2 h-4 w-4" />Usuários</TabsTrigger>}
            {me.isAdmin && <TabsTrigger value="logs"><ScrollText className="mr-2 h-4 w-4" />Logs</TabsTrigger>}
          </TabsList>

          <TabsContent value="mine"><MyOrders userId={me.id} /></TabsContent>
          <TabsContent value="new"><NewOrder userId={me.id} /></TabsContent>
          {(me.isComprador || me.isAdmin) && <TabsContent value="queue"><BuyerQueue /></TabsContent>}
          {me.isAdmin && <TabsContent value="projects"><ProjectsAdmin userId={me.id} /></TabsContent>}
          {me.isAdmin && <TabsContent value="users"><UsersAdmin /></TabsContent>}
          {me.isAdmin && <TabsContent value="logs"><LogsAdmin /></TabsContent>}
        </Tabs>
      </main>
    </div>
  );
}

function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useProfilesMap() {
  return useQuery({
    queryKey: ["profiles-map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email");
      if (error) throw error;
      const map = new Map<string, { full_name: string; email: string | null }>();
      (data ?? []).forEach((p) => map.set(p.id, { full_name: p.full_name, email: p.email }));
      return map;
    },
  });
}

/* ---------- New order ---------- */

const newOrderSchema = z.object({
  project_id: z.string().uuid("Selecione um projeto"),
  item_name: z.string().trim().min(2).max(200),
  item_link: z.string().trim().max(2000).url("Link inválido").optional().or(z.literal("").transform(() => undefined)),
  quantity: z.coerce.number().int().positive("Quantidade inválida").max(100000),
  recipient: z.string().trim().min(2, "Informe o destinatário").max(200),
  requester_notes: z.string().trim().max(2000).optional().or(z.literal("").transform(() => undefined)),
  delivery_point: z.string().trim().min(3).max(300),
});

function NewOrder({ userId }: { userId: string }) {
  const { data: projects, isLoading } = useProjects();
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState("");

  const submit = useMutation({
    mutationFn: async (values: z.infer<typeof newOrderSchema>) => {
      const { error } = await supabase.from("purchase_orders").insert({
        project_id: values.project_id,
        item_name: values.item_name,
        item_link: values.item_link ?? null,
        quantity: values.quantity,
        recipient: values.recipient,
        requester_notes: values.requester_notes ?? null,
        delivery_point: values.delivery_point,
        requester_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido criado!");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = newOrderSchema.safeParse({
      project_id: projectId,
      item_name: fd.get("item_name"),
      item_link: fd.get("item_link") || undefined,
      quantity: fd.get("quantity"),
      recipient: fd.get("recipient"),
      requester_notes: fd.get("requester_notes") || undefined,
      delivery_point: fd.get("delivery_point"),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    submit.mutate(parsed.data, {
      onSuccess: () => {
        (e.target as HTMLFormElement).reset();
        setProjectId("");
      },
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Novo pedido de compra</CardTitle>
        <CardDescription>Preencha os dados do material que você precisa.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando projetos...</p>
        ) : !projects?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum projeto disponível. Peça a um admin para criar um.</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Selecione o projeto" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item_name">Nome do item</Label>
              <Input id="item_name" name="item_name" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade</Label>
                <Input id="quantity" name="quantity" type="number" min={1} defaultValue={1} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipient">Destinatário</Label>
                <Input id="recipient" name="recipient" placeholder="Nome de quem recebe" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item_link">Link de compra <span className="text-muted-foreground">(opcional)</span></Label>
              <Input id="item_link" name="item_link" type="url" placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery_point">Ponto de entrega</Label>
              <Textarea id="delivery_point" name="delivery_point" placeholder="Ex.: Rua X, 123, com João no portão" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requester_notes">Observações <span className="text-muted-foreground">(opcional)</span></Label>
              <Textarea id="requester_notes" name="requester_notes" placeholder="Detalhes adicionais para o comprador" />
            </div>
            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending ? "Enviando..." : "Criar pedido"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- My orders ---------- */

function MyOrders({ userId }: { userId: string }) {
  const { data: projects } = useProjects();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", "mine", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("requester_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  const projectName = (id: string) => projects?.find((p) => p.id === id)?.name ?? "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meus pedidos</CardTitle>
        <CardDescription>Acompanhe o status dos seus pedidos de compra.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
          !orders?.length ? <p className="text-sm text-muted-foreground">Nenhum pedido ainda.</p> :
          <OrdersTable orders={orders} projectName={projectName} showRequester={false} canEditRequester />
        }
      </CardContent>
    </Card>
  );
}

/* ---------- Buyer queue ---------- */

function BuyerQueue() {
  const { data: projects } = useProjects();
  const { data: profiles } = useProfilesMap();
  const { data: me } = useCurrentUser();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  const filtered = orders?.filter((o) => statusFilter === "all" || o.status === statusFilter) ?? [];
  const projectName = (id: string) => projects?.find((p) => p.id === id)?.name ?? "—";
  const requesterName = (id: string) => profiles?.get(id)?.full_name || profiles?.get(id)?.email || "—";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Fila de compras</CardTitle>
          <CardDescription>Todos os pedidos. Atualize status e adicione observações.</CardDescription>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
          !filtered.length ? <p className="text-sm text-muted-foreground">Nada por aqui.</p> :
          <OrdersTable orders={filtered} projectName={projectName} requesterName={requesterName} showRequester canEdit canDelete={me?.isAdmin} />
        }
      </CardContent>
    </Card>
  );
}

/* ---------- Orders table ---------- */

function OrdersTable({
  orders, projectName, requesterName, showRequester, canEdit, canDelete, canEditRequester,
}: {
  orders: Order[];
  projectName: (id: string) => string;
  requesterName?: (id: string) => string;
  showRequester?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canEditRequester?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Qtd</TableHead>
            <TableHead>Projeto</TableHead>
            {showRequester && <TableHead>Solicitante</TableHead>}
            <TableHead>Destinatário</TableHead>
            <TableHead>Entrega</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Obs.</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => (
            <TableRow key={o.id}>
              <TableCell>
                <div className="font-medium">{o.item_name}</div>
                {o.item_link ? (
                  <a href={o.item_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    ver link <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">sem link</span>
                )}
                {o.requester_notes && (
                  <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{o.requester_notes}</div>
                )}
              </TableCell>
              <TableCell>{o.quantity}</TableCell>
              <TableCell>{projectName(o.project_id)}</TableCell>
              {showRequester && <TableCell>{requesterName?.(o.requester_id)}</TableCell>}
              <TableCell className="text-sm">{o.recipient || "—"}</TableCell>
              <TableCell className="max-w-[200px] text-sm text-muted-foreground">{o.delivery_point}</TableCell>
              <TableCell><Badge variant={STATUS_VARIANT[o.status]}>{STATUS_LABELS[o.status]}</Badge></TableCell>
              <TableCell className="max-w-[220px] whitespace-pre-wrap text-xs text-muted-foreground">{o.buyer_notes || "—"}</TableCell>
              <TableCell className="text-right space-x-2 whitespace-nowrap">
                {canEditRequester && o.status === "pendente" && <EditRequesterDialog order={o} />}
                {canEdit && <EditOrderDialog order={o} />}
                {canDelete && <DeleteOrderDialog order={o} />}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EditOrderDialog({ order }: { order: Order }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Order["status"]>(order.status);
  const [notes, setNotes] = useState(order.buyer_notes ?? "");

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("purchase_orders").update({ status, buyer_notes: notes || null }).eq("id", order.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido atualizado");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["logs"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">Editar</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{order.item_name}</DialogTitle>
          <DialogDescription>Atualize o status e adicione observações (ex.: palavra-passe do entregador).</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Order["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Ex.: palavra-passe = laranja" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Projects admin ---------- */

function DeleteOrderDialog({ order }: { order: Order }) {
  // moved below
  return <InternalDeleteOrderDialog order={order} />;
}

function EditRequesterDialog({ order }: { order: Order }) {
  const qc = useQueryClient();
  const { data: projects } = useProjects();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState(order.project_id);

  const save = useMutation({
    mutationFn: async (e: React.FormEvent<HTMLFormElement>) => {
      const fd = new FormData(e.currentTarget);
      const parsed = newOrderSchema.safeParse({
        project_id: projectId,
        item_name: fd.get("item_name"),
        item_link: fd.get("item_link") || undefined,
        quantity: fd.get("quantity"),
        recipient: fd.get("recipient"),
        requester_notes: fd.get("requester_notes") || undefined,
        delivery_point: fd.get("delivery_point"),
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const v = parsed.data;
      const { error } = await supabase.from("purchase_orders").update({
        project_id: v.project_id,
        item_name: v.item_name,
        item_link: v.item_link ?? null,
        quantity: v.quantity,
        recipient: v.recipient,
        requester_notes: v.requester_notes ?? null,
        delivery_point: v.delivery_point,
      }).eq("id", order.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido atualizado");
      qc.invalidateQueries({ queryKey: ["orders"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    save.mutate(e);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">Editar</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar pedido</DialogTitle>
          <DialogDescription>Você pode editar enquanto o pedido está pendente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Projeto</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Selecione o projeto" /></SelectTrigger>
              <SelectContent>
                {(projects ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`e-name-${order.id}`}>Nome do item</Label>
            <Input id={`e-name-${order.id}`} name="item_name" defaultValue={order.item_name} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`e-qty-${order.id}`}>Quantidade</Label>
              <Input id={`e-qty-${order.id}`} name="quantity" type="number" min={1} defaultValue={order.quantity} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`e-rec-${order.id}`}>Destinatário</Label>
              <Input id={`e-rec-${order.id}`} name="recipient" defaultValue={order.recipient} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`e-link-${order.id}`}>Link de compra <span className="text-muted-foreground">(opcional)</span></Label>
            <Input id={`e-link-${order.id}`} name="item_link" type="url" defaultValue={order.item_link ?? ""} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`e-deliv-${order.id}`}>Ponto de entrega</Label>
            <Textarea id={`e-deliv-${order.id}`} name="delivery_point" defaultValue={order.delivery_point} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`e-notes-${order.id}`}>Observações <span className="text-muted-foreground">(opcional)</span></Label>
            <Textarea id={`e-notes-${order.id}`} name="requester_notes" defaultValue={order.requester_notes ?? ""} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InternalDeleteOrderDialog({ order }: { order: Order }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("purchase_orders").delete().eq("id", order.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido excluído");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["logs"] });
      setOpen(false);
      setConfirm("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canConfirm = confirm.trim().toLowerCase() === "excluir";

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirm(""); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive"><Trash2 className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir pedido</DialogTitle>
          <DialogDescription>
            Esta ação apaga <strong>{order.item_name}</strong> e todo o seu histórico. Digite <strong>excluir</strong> para confirmar.
          </DialogDescription>
        </DialogHeader>
        <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder='digite "excluir"' />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="destructive" disabled={!canConfirm || del.isPending} onClick={() => del.mutate()}>
            {del.isPending ? "Excluindo..." : "Excluir definitivamente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectsAdmin({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: projects, isLoading } = useProjects();

  const create = useMutation({
    mutationFn: async (v: { name: string; description: string }) => {
      const { error } = await supabase.from("projects").insert({ ...v, created_by: userId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Projeto criado"); qc.invalidateQueries({ queryKey: ["projects"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Projeto removido"); qc.invalidateQueries({ queryKey: ["projects"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const description = String(fd.get("description") || "").trim();
    if (name.length < 2) return toast.error("Nome muito curto");
    create.mutate({ name, description }, { onSuccess: () => (e.target as HTMLFormElement).reset() });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
      <Card>
        <CardHeader><CardTitle>Novo projeto</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="p-name">Nome</Label><Input id="p-name" name="name" required /></div>
            <div className="space-y-2"><Label htmlFor="p-desc">Descrição</Label><Textarea id="p-desc" name="description" /></div>
            <Button type="submit" disabled={create.isPending}>Criar</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Projetos</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
            !projects?.length ? <p className="text-sm text-muted-foreground">Sem projetos.</p> :
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Descrição</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.description || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => remove.mutate(p.id)}>Excluir</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Users admin ---------- */

function UsersAdmin() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles, error: pe }, { data: roles, error: re }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
      ]);
      if (pe) throw pe;
      if (re) throw re;
      const byUser = new Map<string, AppRole[]>();
      (roles ?? []).forEach((r) => {
        const arr = byUser.get(r.user_id) ?? [];
        arr.push(r.role as AppRole);
        byUser.set(r.user_id, arr);
      });
      return (profiles ?? []).map((p) => ({ ...p, roles: byUser.get(p.id) ?? [] }));
    },
  });

  const toggleRole = useMutation({
    mutationFn: async ({ userId, role, has }: { userId: string; role: AppRole; has: boolean }) => {
      if (has) {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Papéis atualizados"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const allRoles: AppRole[] = ["admin", "comprador", "solicitante"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuários</CardTitle>
        <CardDescription>Clique nos papéis para atribuir ou remover.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Papéis</TableHead></TableRow></TableHeader>
            <TableBody>
              {(data ?? []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {allRoles.map((r) => {
                        const has = u.roles.includes(r);
                        return (
                          <Button
                            key={r}
                            size="sm"
                            variant={has ? "default" : "outline"}
                            onClick={() => toggleRole.mutate({ userId: u.id, role: r, has })}
                          >
                            {r}
                          </Button>
                        );
                      })}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        }
      </CardContent>
    </Card>
  );
}

/* ---------- Logs ---------- */

function LogsAdmin() {
  const { data: profiles } = useProfilesMap();
  const { data: logs, isLoading } = useQuery({
    queryKey: ["logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_logs")
        .select("id, order_id, actor_id, action, details, created_at, purchase_orders(item_name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card>
      <CardHeader><CardTitle>Logs de pedidos</CardTitle><CardDescription>Últimas 200 ações.</CardDescription></CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
          !logs?.length ? <p className="text-sm text-muted-foreground">Nada registrado ainda.</p> :
          <Table>
            <TableHeader><TableRow><TableHead>Quando</TableHead><TableHead>Ação</TableHead><TableHead>Pedido</TableHead><TableHead>Quem</TableHead><TableHead>Detalhes</TableHead></TableRow></TableHeader>
            <TableBody>
              {logs.map((l) => {
                const item = (l as unknown as { purchase_orders?: { item_name: string } }).purchase_orders?.item_name ?? "—";
                const actor = l.actor_id ? (profiles?.get(l.actor_id)?.full_name || profiles?.get(l.actor_id)?.email || "—") : "—";
                return (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell><Badge variant="outline">{l.action}</Badge></TableCell>
                    <TableCell>{item}</TableCell>
                    <TableCell className="text-sm">{actor}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.details ? JSON.stringify(l.details) : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        }
      </CardContent>
    </Card>
  );
}