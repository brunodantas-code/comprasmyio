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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { Package, LogOut, Plus, ExternalLink, ClipboardList, ShoppingCart, FolderKanban, Users, ScrollText, Filter, Library, Boxes, Factory } from "lucide-react";
import { Trash2, Paperclip, X, Download } from "lucide-react";
import { z } from "zod";
import { StockTab } from "@/components/stock-tab";
import { MyioOrdersTab } from "@/components/myio-orders-tab";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Order = {
  id: string;
  project_id: string;
  requester_id: string;
  item_name: string;
  item_link: string | null;
  material_id: string | null;
  quantity: number;
  recipient: string;
  requester_notes: string | null;
  delivery_point: string;
  status: "pendente" | "comprado_aguardando" | "entregue" | "cancelado" | "recebido_ok" | "recebido_problema";
  deadline_type: "urgente" | "esta_semana" | "este_mes" | "customizado";
  deadline_date: string | null;
  buyer_notes: string | null;
  passphrase: string | null;
  delivery_forecast: string | null;
  attachments: Attachment[] | null;
  created_at: string;
  updated_at: string;
};

type Attachment = { path: string; name: string; size: number; type: string };

const ATTACHMENTS_BUCKET = "order-attachments";

async function uploadOrderAttachments(orderId: string, files: File[]): Promise<Attachment[]> {
  const out: Attachment[] = [];
  for (const f of files) {
    const safe = f.name.replace(/[^\w.\-]+/g, "_");
    const path = `${orderId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
    const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(path, f, {
      contentType: f.type || "application/octet-stream",
      upsert: false,
    });
    if (error) throw error;
    out.push({ path, name: f.name, size: f.size, type: f.type });
  }
  return out;
}

async function openAttachment(path: string) {
  const { data, error } = await supabase.storage.from(ATTACHMENTS_BUCKET).createSignedUrl(path, 60 * 10);
  if (error || !data?.signedUrl) return toast.error(error?.message || "Falha ao abrir");
  window.open(data.signedUrl, "_blank", "noopener");
}

function FilePicker({ files, setFiles, label = "Anexar arquivos" }: { files: File[]; setFiles: (f: File[]) => void; label?: string }) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2"><Paperclip className="h-4 w-4" />{label} <span className="text-muted-foreground text-xs">(fotos ou documentos)</span></Label>
      <Input
        type="file"
        multiple
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
        onChange={(e) => {
          const fs = Array.from(e.target.files ?? []);
          setFiles([...files, ...fs]);
          e.target.value = "";
        }}
      />
      {files.length > 0 && (
        <ul className="space-y-1 text-xs">
          {files.map((f, i) => (
            <li key={i} className="flex items-center justify-between rounded border px-2 py-1">
              <span className="truncate">{f.name} <span className="text-muted-foreground">({Math.round(f.size / 1024)} KB)</span></span>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ExistingAttachments({ orderId, attachments, canRemove }: { orderId: string; attachments: Attachment[]; canRemove?: boolean }) {
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: async (att: Attachment) => {
      const { error: se } = await supabase.storage.from(ATTACHMENTS_BUCKET).remove([att.path]);
      if (se) throw se;
      const next = attachments.filter((a) => a.path !== att.path);
      const { error } = await supabase.from("purchase_orders").update({ attachments: next }).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  if (!attachments.length) return <p className="text-xs text-muted-foreground">Nenhum anexo.</p>;
  return (
    <ul className="space-y-1 text-xs">
      {attachments.map((a) => (
        <li key={a.path} className="flex items-center justify-between rounded border px-2 py-1">
          <button type="button" onClick={() => openAttachment(a.path)} className="inline-flex items-center gap-1 truncate text-primary hover:underline">
            <Download className="h-3 w-3" />{a.name}
          </button>
          {canRemove && (
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => remove.mutate(a)} disabled={remove.isPending}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

const STATUS_LABELS: Record<Order["status"], string> = {
  pendente: "Pendente",
  comprado_aguardando: "Comprado e aguardando envio",
  entregue: "Entregue",
  cancelado: "Cancelado",
  recebido_ok: "Recebido corretamente",
  recebido_problema: "Recebido com problemas",
};

const STATUS_CLASSES: Record<Order["status"], string> = {
  pendente: "bg-yellow-500 hover:bg-yellow-500 text-black border-transparent",
  comprado_aguardando: "bg-green-600 hover:bg-green-600 text-white border-transparent",
  entregue: "bg-blue-600 hover:bg-blue-600 text-white border-transparent",
  cancelado: "bg-red-600 hover:bg-red-600 text-white border-transparent",
  recebido_ok: "bg-slate-200 hover:bg-slate-200 text-slate-700 border-transparent",
  recebido_problema:
    "bg-amber-100 hover:bg-amber-100 text-amber-900 border-transparent animate-soft-amber-pulse",
};

const BUYER_STATUS_KEYS: Order["status"][] = ["pendente", "comprado_aguardando", "entregue", "cancelado"];

const DEADLINE_LABELS: Record<Order["deadline_type"], string> = {
  urgente: "Urgente",
  esta_semana: "Esta semana",
  este_mes: "Este mês",
  customizado: "Data específica",
};

const STATUS_KEYS = Object.keys(STATUS_LABELS) as Order["status"][];

function StatusMultiFilter({ selected, setSelected }: { selected: Order["status"][]; setSelected: (s: Order["status"][]) => void }) {
  const allOn = selected.length === STATUS_KEYS.length;
  const toggle = (k: Order["status"]) => {
    setSelected(selected.includes(k) ? selected.filter((s) => s !== k) : [...selected, k]);
  };
  const label = allOn
    ? "Todos os status"
    : selected.length === 0
    ? "Nenhum status"
    : selected.length === 1
    ? STATUS_LABELS[selected[0]]
    : `${selected.length} status`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="w-[200px] justify-start">
          <Filter className="mr-2 h-4 w-4" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[240px] p-2">
        <div className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground">
          <span>Filtrar status</span>
          <button type="button" className="hover:underline" onClick={() => setSelected(allOn ? [] : [...STATUS_KEYS])}>
            {allOn ? "Limpar" : "Todos"}
          </button>
        </div>
        <div className="space-y-1">
          {STATUS_KEYS.map((k) => (
            <label key={k} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
              <Checkbox checked={selected.includes(k)} onCheckedChange={() => toggle(k)} />
              <span className={`inline-block h-2 w-2 rounded-full ${STATUS_CLASSES[k].split(" ")[0]}`} />
              {STATUS_LABELS[k]}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

type DeliveredMode = "all" | "this_week" | "this_month" | "from_date" | "hide_all";

const DELIVERED_LABELS: Record<DeliveredMode, string> = {
  all: "Mostrar todos os entregues",
  this_week: "Entregues só desta semana",
  this_month: "Entregues só deste mês",
  from_date: "Entregues a partir de...",
  hide_all: "Ocultar todos os entregues",
};

function filterDelivered(orders: Order[], mode: DeliveredMode, fromDate: string): Order[] {
  if (mode === "all") return orders;
  const now = new Date();
  return orders.filter((o) => {
    if (o.status !== "entregue" && o.status !== "recebido_ok" && o.status !== "recebido_problema") return true;
    if (mode === "hide_all") return false;
    const ref = new Date(o.updated_at);
    if (mode === "this_week") {
      const start = new Date(now);
      const diff = (start.getDay() + 6) % 7; // segunda-feira como início
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      return ref >= start;
    }
    if (mode === "this_month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return ref >= start;
    }
    if (mode === "from_date") {
      if (!fromDate) return true;
      const start = new Date(fromDate + "T00:00:00");
      return ref >= start;
    }
    return true;
  });
}

function DeliveredFilter({
  mode, setMode, fromDate, setFromDate,
}: {
  mode: DeliveredMode;
  setMode: (m: DeliveredMode) => void;
  fromDate: string;
  setFromDate: (s: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={mode} onValueChange={(v) => setMode(v as DeliveredMode)}>
        <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {Object.entries(DELIVERED_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
        </SelectContent>
      </Select>
      {mode === "from_date" && (
        <Input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="w-[160px]"
        />
      )}
    </div>
  );
}

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
            <TabsTrigger value="stock"><Boxes className="mr-2 h-4 w-4" />Estoque</TabsTrigger>
            {me.isAdmin && <TabsTrigger value="projects"><FolderKanban className="mr-2 h-4 w-4" />Projetos</TabsTrigger>}
            {me.isAdmin && <TabsTrigger value="materials"><Library className="mr-2 h-4 w-4" />Materiais</TabsTrigger>}
            {me.isAdmin && <TabsTrigger value="myio"><Factory className="mr-2 h-4 w-4" />Pedidos Produtos Myio</TabsTrigger>}
            {me.isAdmin && <TabsTrigger value="users"><Users className="mr-2 h-4 w-4" />Usuários</TabsTrigger>}
            {me.isAdmin && <TabsTrigger value="logs"><ScrollText className="mr-2 h-4 w-4" />Logs</TabsTrigger>}
          </TabsList>

          <TabsContent value="mine"><MyOrders userId={me.id} /></TabsContent>
          <TabsContent value="new"><NewOrder userId={me.id} /></TabsContent>
          {(me.isComprador || me.isAdmin) && <TabsContent value="queue"><BuyerQueue /></TabsContent>}
          <TabsContent value="stock"><StockTab userId={me.id} /></TabsContent>
          {me.isAdmin && <TabsContent value="projects"><ProjectsAdmin userId={me.id} /></TabsContent>}
          {me.isAdmin && <TabsContent value="materials"><MaterialsAdmin /></TabsContent>}
            {me.isAdmin && <TabsContent value="myio"><MyioOrdersTab userId={me.id} /></TabsContent>}
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

/* ---------- Materials library ---------- */

type Material = { id: string; name: string; link: string | null };

function useMaterials() {
  return useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const { data, error } = await supabase.from("materials").select("id, name, link").order("name");
      if (error) throw error;
      return (data ?? []) as Material[];
    },
  });
}

function MaterialPicker({ onPick }: { onPick: (m: Material) => void }) {
  const { data: materials, isLoading } = useMaterials();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Library className="mr-1 h-4 w-4" /> Biblioteca
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="end">
        <Command>
          <CommandInput placeholder="Buscar material..." />
          <CommandList>
            <CommandEmpty>{isLoading ? "Carregando..." : "Nenhum material cadastrado."}</CommandEmpty>
            <CommandGroup>
              {(materials ?? []).map((m) => (
                <CommandItem
                  key={m.id}
                  value={m.name}
                  onSelect={() => { onPick(m); setOpen(false); }}
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{m.name}</span>
                    {m.link && <span className="truncate text-xs text-muted-foreground">{m.link}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
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
  deadline_type: z.enum(["urgente", "esta_semana", "este_mes", "customizado"]),
  deadline_date: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
}).refine((v) => v.deadline_type !== "customizado" || !!v.deadline_date, {
  message: "Informe a data limite",
  path: ["deadline_date"],
});

function NewOrder({ userId }: { userId: string }) {
  const { data: projects, isLoading } = useProjects();
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [deadlineType, setDeadlineType] = useState<Order["deadline_type"]>("esta_semana");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemLink, setItemLink] = useState("");
  const [materialId, setMaterialId] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async (values: z.infer<typeof newOrderSchema>) => {
      const { data, error } = await supabase.from("purchase_orders").insert({
        project_id: values.project_id,
        item_name: values.item_name,
        item_link: values.item_link ?? null,
        material_id: materialId,
        quantity: values.quantity,
        recipient: values.recipient,
        requester_notes: values.requester_notes ?? null,
        delivery_point: values.delivery_point,
        deadline_type: values.deadline_type,
        deadline_date: values.deadline_type === "customizado" ? (values.deadline_date ?? null) : null,
        requester_id: userId,
      }).select("id").single();
      if (error) throw error;
      if (files.length && data?.id) {
        const uploaded = await uploadOrderAttachments(data.id, files);
        const { error: ue } = await supabase.from("purchase_orders").update({ attachments: uploaded }).eq("id", data.id);
        if (ue) throw ue;
      }
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
      item_name: itemName,
      item_link: itemLink || undefined,
      quantity: fd.get("quantity"),
      recipient: fd.get("recipient"),
      requester_notes: fd.get("requester_notes") || undefined,
      delivery_point: fd.get("delivery_point"),
      deadline_type: deadlineType,
      deadline_date: deadlineDate || undefined,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    submit.mutate(parsed.data, {
      onSuccess: () => {
        (e.target as HTMLFormElement).reset();
        setProjectId("");
        setFiles([]);
        setDeadlineType("esta_semana");
        setDeadlineDate("");
        setItemName("");
        setItemLink("");
        setMaterialId(null);
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
              <div className="flex items-center justify-between">
                <Label htmlFor="item_name">Nome do item</Label>
                <MaterialPicker onPick={(m) => { setItemName(m.name); setMaterialId(m.id); if (m.link) setItemLink(m.link); }} />
              </div>
              <Input
                id="item_name"
                value={itemName}
                onChange={(e) => { setItemName(e.target.value); setMaterialId(null); }}
                placeholder="Digite ou selecione da biblioteca"
                required
              />
              {materialId && (
                <p className="text-xs text-muted-foreground">Vinculado à biblioteca — ao receber, entra automaticamente no estoque.</p>
              )}
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
              <Input id="item_link" type="url" placeholder="https://..." value={itemLink} onChange={(e) => setItemLink(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery_point">Ponto de entrega</Label>
              <Textarea id="delivery_point" name="delivery_point" placeholder="Ex.: Rua X, 123, com João no portão" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Prazo de recebimento</Label>
                <Select value={deadlineType} onValueChange={(v) => setDeadlineType(v as Order["deadline_type"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEADLINE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {deadlineType === "customizado" && (
                <div className="space-y-2">
                  <Label htmlFor="deadline_date">Data limite</Label>
                  <Input id="deadline_date" type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} required />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="requester_notes">Observações <span className="text-muted-foreground">(opcional)</span></Label>
              <Textarea id="requester_notes" name="requester_notes" placeholder="Detalhes adicionais para o comprador" />
            </div>
            <FilePicker files={files} setFiles={setFiles} />
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
  const [deliveredMode, setDeliveredMode] = useState<DeliveredMode>("all");
  const [deliveredFrom, setDeliveredFrom] = useState("");
  const [statusSelected, setStatusSelected] = useState<Order["status"][]>([...STATUS_KEYS]);
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
  const statusFiltered = (orders ?? []).filter((o) => statusSelected.includes(o.status));
  const visible = filterDelivered(statusFiltered, deliveredMode, deliveredFrom);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Meus pedidos</CardTitle>
          <CardDescription>Acompanhe o status dos seus pedidos de compra.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusMultiFilter selected={statusSelected} setSelected={setStatusSelected} />
          <DeliveredFilter mode={deliveredMode} setMode={setDeliveredMode} fromDate={deliveredFrom} setFromDate={setDeliveredFrom} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
          !orders?.length ? <p className="text-sm text-muted-foreground">Nenhum pedido ainda.</p> :
          !visible.length ? <p className="text-sm text-muted-foreground">Nenhum pedido para exibir com o filtro atual.</p> :
          <OrdersTable orders={visible} projectName={projectName} showRequester={false} canEditRequester />
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
  const [statusSelected, setStatusSelected] = useState<Order["status"][]>([...STATUS_KEYS]);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [groupByProject, setGroupByProject] = useState(false);
  const [deliveredMode, setDeliveredMode] = useState<DeliveredMode>("all");
  const [deliveredFrom, setDeliveredFrom] = useState("");

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

  const baseFiltered = orders?.filter((o) =>
    statusSelected.includes(o.status) &&
    (projectFilter === "all" || o.project_id === projectFilter)
  ) ?? [];
  const filtered = filterDelivered(baseFiltered, deliveredMode, deliveredFrom);
  const projectName = (id: string) => projects?.find((p) => p.id === id)?.name ?? "—";
  const requesterName = (id: string) => profiles?.get(id)?.full_name || profiles?.get(id)?.email || "—";

  const grouped = groupByProject
    ? Array.from(
        filtered.reduce((map, o) => {
          const arr = map.get(o.project_id) ?? [];
          arr.push(o);
          map.set(o.project_id, arr);
          return map;
        }, new Map<string, Order[]>()).entries()
      ).sort((a, b) => projectName(a[0]).localeCompare(projectName(b[0])))
    : null;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Fila de compras</CardTitle>
          <CardDescription>Todos os pedidos. Atualize status e adicione observações.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Projeto" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os projetos</SelectItem>
              {projects?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <StatusMultiFilter selected={statusSelected} setSelected={setStatusSelected} />
          <Button
            type="button"
            variant={groupByProject ? "default" : "outline"}
            size="sm"
            onClick={() => setGroupByProject((v) => !v)}
          >
            Agrupar por projeto
          </Button>
          <DeliveredFilter mode={deliveredMode} setMode={setDeliveredMode} fromDate={deliveredFrom} setFromDate={setDeliveredFrom} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !filtered.length ? (
          <p className="text-sm text-muted-foreground">Nada por aqui.</p>
        ) : grouped ? (
          grouped.map(([pid, list]) => (
            <div key={pid} className="space-y-2">
              <div className="flex items-center justify-between border-b pb-1">
                <h3 className="text-sm font-semibold">{projectName(pid)}</h3>
                <span className="text-xs text-muted-foreground">{list.length} pedido(s)</span>
              </div>
              <OrdersTable orders={list} projectName={projectName} requesterName={requesterName} showRequester canEdit canDelete={me?.isAdmin} />
            </div>
          ))
        ) : (
          <OrdersTable orders={filtered} projectName={projectName} requesterName={requesterName} showRequester canEdit canDelete={me?.isAdmin} />
        )}
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
            <TableHead>Prazo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Previsão de entrega</TableHead>
            <TableHead>Palavra passe</TableHead>
            <TableHead>Obs.</TableHead>
            <TableHead className="w-[110px]">Anexos</TableHead>
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
              <TableCell className="text-xs">
                <div>{DEADLINE_LABELS[o.deadline_type]}</div>
                {o.deadline_type === "customizado" && o.deadline_date && (
                  <div className="text-muted-foreground">{new Date(o.deadline_date + "T00:00:00").toLocaleDateString("pt-BR")}</div>
                )}
              </TableCell>
              <TableCell><StatusHistoryDialog order={o} /></TableCell>
              <TableCell className="text-sm font-semibold text-foreground whitespace-nowrap">
                {o.delivery_forecast
                  ? new Date(o.delivery_forecast + "T00:00:00").toLocaleDateString("pt-BR")
                  : "—"}
              </TableCell>
              <TableCell className="max-w-[180px] text-sm font-semibold text-foreground whitespace-pre-wrap">
                {o.passphrase || "—"}
              </TableCell>
              <TableCell className="max-w-[220px] text-xs text-muted-foreground">
                <div className="whitespace-pre-wrap">{o.buyer_notes || "—"}</div>
              </TableCell>
              <TableCell className="w-[110px] max-w-[110px] text-xs">
                <ExistingAttachments orderId={o.id} attachments={o.attachments ?? []} />
              </TableCell>
              <TableCell className="text-right space-x-2 whitespace-nowrap">
                {canEditRequester && o.status === "pendente" && <EditRequesterDialog order={o} />}
                {canEditRequester && o.status === "entregue" && <ConfirmReceiptActions order={o} />}
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

function ConfirmReceiptActions({ order }: { order: Order }) {
  const qc = useQueryClient();
  const setStatus = useMutation({
    mutationFn: async (status: Order["status"]) => {
      const { error } = await supabase.from("purchase_orders").update({ status }).eq("id", order.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["material-stock"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      toast.success("Recebimento confirmado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => setStatus.mutate("recebido_ok")}>
        Recebido corretamente
      </Button>
      <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => setStatus.mutate("recebido_problema")}>
        Recebido com problemas
      </Button>
    </>
  );
}

function EditOrderDialog({ order }: { order: Order }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Order["status"]>(order.status);
  const [notes, setNotes] = useState(order.buyer_notes ?? "");
  const [passphrase, setPassphrase] = useState(order.passphrase ?? "");
  const [forecast, setForecast] = useState(order.delivery_forecast ?? "");
  const [files, setFiles] = useState<File[]>([]);

  const save = useMutation({
    mutationFn: async () => {
      let attachments = order.attachments ?? [];
      if (files.length) {
        const uploaded = await uploadOrderAttachments(order.id, files);
        attachments = [...attachments, ...uploaded];
      }
      const { error } = await supabase
        .from("purchase_orders")
        .update({
          status,
          buyer_notes: notes || null,
          passphrase: passphrase || null,
          delivery_forecast: forecast || null,
          attachments,
        })
        .eq("id", order.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido atualizado");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["logs"] });
      setFiles([]);
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">Editar</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                {(BUYER_STATUS_KEYS.includes(status) ? BUYER_STATUS_KEYS : [...BUYER_STATUS_KEYS, status]).map((v) => (
                  <SelectItem key={v} value={v}>{STATUS_LABELS[v]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Palavra passe</Label>
            <Input value={passphrase} onChange={(e) => setPassphrase(e.target.value)} placeholder="Ex.: laranja" />
          </div>
          <div className="space-y-2">
            <Label>Previsão de entrega</Label>
            <Input type="date" value={forecast} onChange={(e) => setForecast(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Ex.: palavra-passe = laranja" />
          </div>
          <div className="space-y-2">
            <Label>Anexos existentes</Label>
            <ExistingAttachments orderId={order.id} attachments={order.attachments ?? []} canRemove />
          </div>
          <FilePicker files={files} setFiles={setFiles} label="Adicionar novos anexos" />
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
  const [files, setFiles] = useState<File[]>([]);
  const [deadlineType, setDeadlineType] = useState<Order["deadline_type"]>(order.deadline_type);
  const [deadlineDate, setDeadlineDate] = useState(order.deadline_date ?? "");
  const [itemName, setItemName] = useState(order.item_name);
  const [itemLink, setItemLink] = useState(order.item_link ?? "");
  const [materialId, setMaterialId] = useState<string | null>(order.material_id ?? null);

  const save = useMutation({
    mutationFn: async (v: z.infer<typeof newOrderSchema>) => {
      let attachments = order.attachments ?? [];
      if (files.length) {
        const uploaded = await uploadOrderAttachments(order.id, files);
        attachments = [...attachments, ...uploaded];
      }
      const { error } = await supabase.from("purchase_orders").update({
        project_id: v.project_id,
        item_name: v.item_name,
        item_link: v.item_link ?? null,
        material_id: materialId,
        quantity: v.quantity,
        recipient: v.recipient,
        requester_notes: v.requester_notes ?? null,
        delivery_point: v.delivery_point,
        deadline_type: v.deadline_type,
        deadline_date: v.deadline_type === "customizado" ? (v.deadline_date ?? null) : null,
        attachments,
      }).eq("id", order.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido atualizado");
      qc.invalidateQueries({ queryKey: ["orders"] });
      setFiles([]);
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = newOrderSchema.safeParse({
      project_id: projectId,
      item_name: itemName,
      item_link: itemLink || undefined,
      quantity: fd.get("quantity"),
      recipient: fd.get("recipient"),
      requester_notes: fd.get("requester_notes") || undefined,
      delivery_point: fd.get("delivery_point"),
      deadline_type: deadlineType,
      deadline_date: deadlineDate || undefined,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    save.mutate(parsed.data);
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
            <div className="flex items-center justify-between">
              <Label htmlFor={`e-name-${order.id}`}>Nome do item</Label>
              <MaterialPicker onPick={(m) => { setItemName(m.name); setMaterialId(m.id); if (m.link) setItemLink(m.link); }} />
            </div>
            <Input id={`e-name-${order.id}`} value={itemName} onChange={(e) => { setItemName(e.target.value); setMaterialId(null); }} required />
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
            <Input id={`e-link-${order.id}`} type="url" value={itemLink} onChange={(e) => setItemLink(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`e-deliv-${order.id}`}>Ponto de entrega</Label>
            <Textarea id={`e-deliv-${order.id}`} name="delivery_point" defaultValue={order.delivery_point} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Prazo de recebimento</Label>
              <Select value={deadlineType} onValueChange={(v) => setDeadlineType(v as Order["deadline_type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DEADLINE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {deadlineType === "customizado" && (
              <div className="space-y-2">
                <Label htmlFor={`e-deadline-${order.id}`}>Data limite</Label>
                <Input id={`e-deadline-${order.id}`} type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} required />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`e-notes-${order.id}`}>Observações <span className="text-muted-foreground">(opcional)</span></Label>
            <Textarea id={`e-notes-${order.id}`} name="requester_notes" defaultValue={order.requester_notes ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Anexos existentes</Label>
            <ExistingAttachments orderId={order.id} attachments={order.attachments ?? []} canRemove />
          </div>
          <FilePicker files={files} setFiles={setFiles} label="Adicionar novos anexos" />
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

function MaterialsAdmin() {
  const qc = useQueryClient();
  const { data: materials, isLoading } = useMaterials();

  const create = useMutation({
    mutationFn: async (v: { name: string; link: string | null }) => {
      const { error } = await supabase.from("materials").insert(v);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Material adicionado"); qc.invalidateQueries({ queryKey: ["materials"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("materials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Material removido"); qc.invalidateQueries({ queryKey: ["materials"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const link = String(fd.get("link") || "").trim();
    if (name.length < 2) return toast.error("Nome muito curto");
    if (link && !/^https?:\/\//i.test(link)) return toast.error("Link inválido");
    create.mutate({ name, link: link || null }, { onSuccess: () => (e.target as HTMLFormElement).reset() });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
      <Card>
        <CardHeader>
          <CardTitle>Novo material</CardTitle>
          <CardDescription>Cadastre itens que aparecerão como sugestão nos novos pedidos.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="m-name">Nome</Label><Input id="m-name" name="name" required /></div>
            <div className="space-y-2"><Label htmlFor="m-link">Link <span className="text-muted-foreground">(opcional)</span></Label><Input id="m-link" name="link" type="url" placeholder="https://..." /></div>
            <Button type="submit" disabled={create.isPending}>Adicionar</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Biblioteca de materiais</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
            !materials?.length ? <p className="text-sm text-muted-foreground">Nenhum material cadastrado.</p> :
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Link</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {materials.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="text-sm">
                      {m.link ? (
                        <a href={m.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                          <ExternalLink className="h-3 w-3" /> Abrir
                        </a>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => remove.mutate(m.id)}>Excluir</Button>
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

function StatusHistoryDialog({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const { data: profiles } = useProfilesMap();
  const { data: logs, isLoading } = useQuery({
    queryKey: ["order-logs", order.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_logs")
        .select("id, actor_id, action, details, created_at")
        .eq("order_id", order.id)
        .in("action", ["criado", "status_alterado"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const nameFor = (id: string | null) => {
    if (!id) return "—";
    const p = profiles?.get(id);
    return p?.full_name || p?.email || "—";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="cursor-pointer">
          <Badge className={STATUS_CLASSES[order.status]}>{STATUS_LABELS[order.status]}</Badge>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Histórico de status</DialogTitle>
          <DialogDescription>{order.item_name}</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !logs?.length ? (
          <p className="text-sm text-muted-foreground">Sem histórico.</p>
        ) : (
          <ol className="space-y-3">
            {logs.map((l) => {
              const d = (l.details ?? {}) as { status?: string; de?: string; para?: string };
              const isCreation = l.action === "criado";
              const rawStatus = isCreation ? d.status : d.para;
              // Mapeia status legados (antes da simplificação do enum) para os atuais
              const legacyMap: Record<string, Order["status"]> = {
                comprado: "comprado_aguardando",
                aguardando: "comprado_aguardando",
                a_caminho: "comprado_aguardando",
              };
              const statusKey = (rawStatus && (legacyMap[rawStatus] ?? (rawStatus as Order["status"]))) as Order["status"] | undefined;
              const label = statusKey && STATUS_LABELS[statusKey] ? STATUS_LABELS[statusKey] : (rawStatus ?? l.action);
              const cls = statusKey && STATUS_CLASSES[statusKey] ? STATUS_CLASSES[statusKey] : "bg-muted text-foreground border-transparent";
              return (
                <li key={l.id} className="flex items-start gap-3 border-l-2 border-muted pl-3">
                  <Badge className={cls}>{label}</Badge>
                  <div className="text-sm">
                    <div>{isCreation ? "criado por" : "alterado por"} <span className="font-medium">{nameFor(l.actor_id)}</span></div>
                    <div className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}

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