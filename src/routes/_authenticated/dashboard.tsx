import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MyioLogo } from "@/components/myio-logo";
import { supabase } from "@/integrations/supabase/client";
import { exportDatabaseBackup } from "@/lib/backup.functions";
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
import { LogOut, Plus, ExternalLink, ClipboardList, ShoppingCart, FolderKanban, Users, ScrollText, Filter, Boxes, Factory, Building2, Plane } from "lucide-react";
import { Trash2, Paperclip, X, Download, Loader2, DatabaseBackup } from "lucide-react";
import { z } from "zod";
import { StockTab } from "@/components/stock-tab";
import { MyioOrdersTab } from "@/components/myio-orders-tab";
import { ClientsTab, useClients } from "@/components/clients-tab";
import { ImportBatchesSection } from "@/components/import-batches";
import { AddressAutocomplete } from "@/components/address-autocomplete";



export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Order = {
  id: string;
  project_id: string | null;
  for_stock: boolean;
  requester_id: string;
  item_name: string;
  item_link: string | null;
  material_id: string | null;
  terceiros_material_id: string | null;
  tool_asset_id?: string | null;
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
        <Button type="button" variant="outline" size="sm" className="w-full justify-start sm:w-[200px]">
          <Filter className="mr-2 h-4 w-4" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(15rem,calc(100vw-2rem))] p-2">
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

function sortProblemFirst(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => {
    if (a.status === "recebido_problema" && b.status !== "recebido_problema") return -1;
    if (b.status === "recebido_problema" && a.status !== "recebido_problema") return 1;
    return 0;
  });
}

function filterDelivered(orders: Order[], mode: DeliveredMode, fromDate: string): Order[] {
  let result = orders;
  if (mode !== "all") {
    const now = new Date();
    result = orders.filter((o) => {
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
  return sortProblemFirst(result);
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
        <SelectTrigger className="w-full sm:w-[240px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {Object.entries(DELIVERED_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
        </SelectContent>
      </Select>
      {mode === "from_date" && (
        <Input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="w-full sm:w-[160px]"
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

  const fabricaOnly = me.isFabrica && !me.isAdmin && !me.isComprador;
  const defaultTab = me.isComprador ? "queue" : me.isAdmin ? "queue" : "pedidos";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:flex sm:justify-between sm:px-6 sm:py-4">
          <Link to="/" className="flex min-w-0 items-center font-semibold">
            <MyioLogo className="truncate text-3xl sm:text-[2.8125rem]" />
          </Link>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="min-w-0 text-right">
              <div className="truncate text-xs font-medium sm:text-sm">{me.full_name || me.email}</div>
              <div className="flex flex-wrap justify-end gap-1">
                {me.roles.map((r) => (
                  <Badge key={r} variant="outline" className="text-[10px] uppercase">{r}</Badge>
                ))}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={handleSignOut} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8">
        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="pedidos"><ClipboardList className="mr-2 h-4 w-4" />Solicitações de Compras</TabsTrigger>
            {(me.isComprador || me.isAdmin) && (
              <TabsTrigger value="queue"><ShoppingCart className="mr-2 h-4 w-4" />Fila de compras</TabsTrigger>
            )}
            <TabsTrigger value="stock"><Boxes className="mr-2 h-4 w-4" />Armazém</TabsTrigger>
            {me.isAdmin && <TabsTrigger value="projects"><FolderKanban className="mr-2 h-4 w-4" />Projetos e clientes</TabsTrigger>}
            
            {(me.isAdmin || fabricaOnly) && <TabsTrigger value="myio"><Factory className="mr-2 h-4 w-4" />Ordem de Expedição</TabsTrigger>}
            {me.isAdmin && <TabsTrigger value="admin"><Users className="mr-2 h-4 w-4" />Usuários e logs</TabsTrigger>}
          </TabsList>

          <TabsContent value="pedidos">
            <Tabs defaultValue="mine">
              <TabsList className="mb-4">
                <TabsTrigger value="mine"><ClipboardList className="mr-2 h-4 w-4" />Minhas compras</TabsTrigger>
                <TabsTrigger value="new"><Plus className="mr-2 h-4 w-4" />Nova Solicitação de compra</TabsTrigger>
                <TabsTrigger value="import"><Plane className="mr-2 h-4 w-4" />Importação</TabsTrigger>
              </TabsList>
              <TabsContent value="mine"><MyOrders userId={me.id} /></TabsContent>
              <TabsContent value="new"><NewOrder userId={me.id} /></TabsContent>
              <TabsContent value="import"><ImportOrders userId={me.id} /></TabsContent>
            </Tabs>
          </TabsContent>
          {(me.isComprador || me.isAdmin) && <TabsContent value="queue"><BuyerQueue /></TabsContent>}
          <TabsContent value="stock"><StockTab userId={me.id} canDelete={me.isAdmin} onlyLocation={fabricaOnly ? "fabrica" : undefined} /></TabsContent>
          {me.isAdmin && (
            <TabsContent value="projects">
              <Tabs defaultValue="projetos">
                <TabsList className="mb-4">
                  <TabsTrigger value="projetos"><FolderKanban className="mr-2 h-4 w-4" />Projetos</TabsTrigger>
                  <TabsTrigger value="clientes"><Building2 className="mr-2 h-4 w-4" />Clientes</TabsTrigger>
                </TabsList>
                <TabsContent value="projetos"><ProjectsAdmin userId={me.id} /></TabsContent>
                <TabsContent value="clientes"><ClientsTab userId={me.id} /></TabsContent>
              </Tabs>
            </TabsContent>
          )}
          
            {(me.isAdmin || fabricaOnly) && (
              <TabsContent value="myio"><MyioOrdersTab userId={me.id} canManage={me.isAdmin} /></TabsContent>
            )}
          {me.isAdmin && (
            <TabsContent value="admin">
              <Tabs defaultValue="usuarios">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <TabsList>
                    <TabsTrigger value="usuarios"><Users className="mr-2 h-4 w-4" />Usuários</TabsTrigger>
                    <TabsTrigger value="logs"><ScrollText className="mr-2 h-4 w-4" />Logs</TabsTrigger>
                  </TabsList>
                  <BackupButton />
                </div>
                <TabsContent value="usuarios"><UsersAdmin /></TabsContent>
                <TabsContent value="logs"><LogsAdmin /></TabsContent>
              </Tabs>
            </TabsContent>
          )}
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

function useProfilesList() {
  return useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ---------- Materials library ---------- */

type PurchasableItem = {
  key: string;
  name: string;
  link: string | null;
  origin: string;
  material_id: string | null;
  terceiros_material_id: string | null;
  tool_asset_id: string | null;
};

function usePurchasableItems() {
  return useQuery({
    queryKey: ["purchasable-items"],
    queryFn: async () => {
      const [{ data: mats, error: me }, { data: ters, error: te }, { data: tools, error: fe }] = await Promise.all([
        supabase.from("materials").select("id, name, link, location").in("location", ["fabrica", "almoxarifado"]).eq("is_manufactured", false).order("name"),
        supabase.from("terceiros_materials").select("id, name, link").order("name"),
        supabase.from("tool_assets").select("id, name, link").order("name"),
      ]);
      if (me) throw me;
      if (te) throw te;
      if (fe) throw fe;
      const items: PurchasableItem[] = [];
      (mats ?? []).forEach((m) =>
        items.push({
          key: `mat:${m.id}`,
          name: m.name,
          link: m.link,
          origin: m.location === "fabrica" ? "Estoque — Fábrica" : "Almoxarifado",
          material_id: m.id,
          terceiros_material_id: null,
          tool_asset_id: null,
        })
      );
      (ters ?? []).forEach((t) =>
        items.push({
          key: `ter:${t.id}`,
          name: t.name,
          link: t.link,
          origin: "Insumos de Instalação",
          material_id: null,
          terceiros_material_id: t.id,
          tool_asset_id: null,
        })
      );
      (tools ?? []).forEach((t) =>
        items.push({
          key: `fer:${t.id}`,
          name: t.name,
          link: t.link,
          origin: "Ferramentas/Ativos",
          material_id: null,
          terceiros_material_id: null,
          tool_asset_id: t.id,
        })
      );
      return items;
    },
  });
}

const CATEGORIES = [
  { value: "todas", label: "Todas" },
  { value: "Insumos de Instalação", label: "Insumos de Instalação" },
  { value: "Insumos de Fabricação", label: "Insumos de Fabricação" },
  { value: "Material de Almoxarifado", label: "Material de Almoxarifado" },
  { value: "Máquinas e Ferramentas", label: "Máquinas e Ferramentas" },
] as const;

function PurchasableItemPicker({ value, onPick, disabled }: { value: PurchasableItem | null; onPick: (i: PurchasableItem) => void; disabled?: boolean }) {
  const { data: items, isLoading } = usePurchasableItems();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("todas");
  const origins = ["Insumos de Fabricação", "Insumos de Instalação", "Material de Almoxarifado", "Máquinas e Ferramentas"];
  const filtered = (items ?? []).filter((i) => category === "todas" || i.origin === category);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start font-normal" disabled={disabled}>
          {value ? (
            <span className="truncate">
              {value.name} <span className="text-xs text-muted-foreground">· {value.origin}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Selecione um item cadastrado...</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(24rem,calc(100vw-2rem))] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar item cadastrado..." />
          <CommandList>
            <CommandEmpty>{isLoading ? "Carregando..." : "Nenhum item cadastrado nos estoques."}</CommandEmpty>
            {origins.map((origin) => {
              const list = (items ?? []).filter((i) => i.origin === origin);
              if (!list.length) return null;
              return (
                <CommandGroup key={origin} heading={origin}>
                  {list.map((i) => (
                    <CommandItem
                      key={i.key}
                      value={`${i.name} (${i.origin})`}
                      onSelect={() => { onPick(i); setOpen(false); }}
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate">{i.name}</span>
                        {i.link && <span className="truncate text-xs text-muted-foreground">{i.link}</span>}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ---------- New order ---------- */

const newOrderSchema = z.object({
  project_id: z.string().optional(),
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
  const [forStock, setForStock] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [deadlineType, setDeadlineType] = useState<Order["deadline_type"]>("esta_semana");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [item, setItem] = useState<PurchasableItem | null>(null);
  const [itemLink, setItemLink] = useState("");
  const [isNewItem, setIsNewItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [recipient, setRecipient] = useState("");
  const { data: profiles } = useProfilesList();

  const submit = useMutation({
    mutationFn: async (values: z.infer<typeof newOrderSchema>) => {
      const { data, error } = await supabase.from("purchase_orders").insert({
        project_id: forStock ? null : (values.project_id ?? null),
        for_stock: forStock,
        item_name: values.item_name,
        item_link: values.item_link ?? null,
        material_id: isNewItem ? null : (item?.material_id ?? null),
        terceiros_material_id: isNewItem ? null : (item?.terceiros_material_id ?? null),
        tool_asset_id: isNewItem ? null : (item?.tool_asset_id ?? null),
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
    if (isNewItem) {
      if (newItemName.trim().length < 2) return toast.error("Descreva o item novo.");
      if (!itemLink.trim()) return toast.error("Informe o link de referência do item novo.");
    } else if (!item) {
      return toast.error("Selecione um item cadastrado no Estoque — Fábrica, Insumos de Instalação ou Almoxarifado.");
    }
    if (!forStock && !projectId) {
      return toast.error("Selecione um projeto");
    }
    const fd = new FormData(e.currentTarget);
    const parsed = newOrderSchema.safeParse({
      project_id: forStock ? undefined : projectId,
      item_name: isNewItem ? newItemName : item!.name,
      item_link: itemLink || undefined,
      quantity: fd.get("quantity"),
      recipient: recipient,
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
        setForStock(false);
        setFiles([]);
        setDeadlineType("esta_semana");
        setDeadlineDate("");
        setItem(null);
        setItemLink("");
        setIsNewItem(false);
        setNewItemName("");
        setRecipient("");
      },
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Nova Solicitação de Compra</CardTitle>
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
              <Label>Alocação</Label>
              <div className="flex items-center gap-6">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={!forStock} onCheckedChange={() => setForStock(false)} />
                  Projeto
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={forStock} onCheckedChange={() => setForStock(true)} />
                  Estoque
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select value={forStock ? "" : projectId} onValueChange={setProjectId} disabled={forStock}>
                <SelectTrigger><SelectValue placeholder={forStock ? "Compra para estoque" : "Selecione o projeto"} /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-6">
                <Label>Item</Label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={!isNewItem} onCheckedChange={() => { setIsNewItem(false); setNewItemName(""); }} />
                  Cadastrado
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={isNewItem} onCheckedChange={() => { setIsNewItem(true); setItem(null); setItemLink(""); }} />
                  Novo
                </label>
              </div>
              <PurchasableItemPicker value={isNewItem ? null : item} onPick={(i) => { setItem(i); if (i.link) setItemLink(i.link); }} disabled={isNewItem} />
              {isNewItem ? (
                <div className="space-y-2 pt-1">
                  <Label htmlFor="new_item_name">Descrição do item</Label>
                  <Input id="new_item_name" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="Descreva o item que precisa ser comprado" />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Somente itens cadastrados no Estoque — Fábrica, Insumos de Instalação ou Almoxarifado. Ao receber, entra automaticamente no estoque de origem.
                </p>
              )}
            </div>
            <div className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade</Label>
                <Input id="quantity" name="quantity" type="number" min={1} defaultValue={1} required />
              </div>
              <div className="space-y-2">
                <Label>Destinatário</Label>
                <Select value={recipient} onValueChange={setRecipient}>
                  <SelectTrigger><SelectValue placeholder="Selecione o usuário" /></SelectTrigger>
                  <SelectContent>
                    {(profiles ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.full_name || p.email || p.id}>
                        {p.full_name || p.email || p.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item_link">
                Link de Referência {isNewItem ? null : <span className="text-muted-foreground">(opcional)</span>}
              </Label>
              <Input id="item_link" type="url" placeholder="https://..." value={itemLink} onChange={(e) => setItemLink(e.target.value)} required={isNewItem} />
            </div>
            <AddressAutocomplete name="delivery_point" required />

            <div className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-2">
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
  const [deliveredMode, setDeliveredMode] = useState<DeliveredMode>("this_month");
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
          <CardTitle>Minhas Solicitações de Compra</CardTitle>
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

/* ---------- Import orders ---------- */

function useImportMaterialIds() {
  return useQuery({
    queryKey: ["materials", "import-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id, purchase_type")
        .eq("purchase_type", "importacao");
      if (error) throw error;
      return new Set((data ?? []).map((m) => m.id));
    },
  });
}

function ImportOrders({ userId }: { userId: string }) {
  const { data: projects } = useProjects();
  const importIds = useImportMaterialIds();
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
  const importOrders = (orders ?? []).filter((o) => o.material_id && importIds.data?.has(o.material_id));
  const statusFiltered = importOrders.filter((o) => statusSelected.includes(o.status));
  const visible = filterDelivered(statusFiltered, deliveredMode, deliveredFrom);

  return (
    <div className="space-y-6">
    <ImportBatchesSection userId={userId} />
    <Card>

      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Pedidos de Importação</CardTitle>
          <CardDescription>Acompanhe os pedidos cujo material é importado (prazos mais longos).</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusMultiFilter selected={statusSelected} setSelected={setStatusSelected} />
          <DeliveredFilter mode={deliveredMode} setMode={setDeliveredMode} fromDate={deliveredFrom} setFromDate={setDeliveredFrom} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || importIds.isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
          !importOrders.length ? <p className="text-sm text-muted-foreground">Nenhum pedido de importação.</p> :
          !visible.length ? <p className="text-sm text-muted-foreground">Nenhum pedido para exibir com o filtro atual.</p> :
          <OrdersTable orders={visible} projectName={projectName} showRequester={false} canEditRequester />
        }
      </CardContent>
    </Card>
    </div>
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
  const [deliveredMode, setDeliveredMode] = useState<DeliveredMode>("this_month");
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

  const { data: purchaseTypes } = useQuery({
    queryKey: ["purchase-types"],
    queryFn: async () => {
      const [{ data: mats, error: me2 }, { data: ters, error: te }, { data: tools, error: fe }] = await Promise.all([
        supabase.from("materials").select("id, purchase_type"),
        supabase.from("terceiros_materials").select("id, purchase_type"),
        supabase.from("tool_assets").select("id, purchase_type"),
      ]);
      if (me2) throw me2;
      if (te) throw te;
      if (fe) throw fe;
      const map = new Map<string, string | null>();
      (mats ?? []).forEach((m) => map.set(`mat:${m.id}`, m.purchase_type));
      (ters ?? []).forEach((t) => map.set(`ter:${t.id}`, t.purchase_type));
      (tools ?? []).forEach((t) => map.set(`fer:${t.id}`, t.purchase_type));
      return map;
    },
  });

  const baseFiltered = orders?.filter((o) =>
    statusSelected.includes(o.status) &&
    (projectFilter === "all" || o.project_id === projectFilter)
  ) ?? [];
  const filtered = filterDelivered(baseFiltered, deliveredMode, deliveredFrom);
  const projectName = (id: string) => projects?.find((p) => p.id === id)?.name ?? "—";
  const requesterName = (id: string) => profiles?.get(id)?.full_name || profiles?.get(id)?.email || "—";

  const isImportado = (o: Order) => {
    const key = o.material_id
      ? `mat:${o.material_id}`
      : o.terceiros_material_id
        ? `ter:${o.terceiros_material_id}`
        : o.tool_asset_id
          ? `fer:${o.tool_asset_id}`
          : null;
    return key ? purchaseTypes?.get(key) === "importacao" : false;
  };
  const nacionais = filtered.filter((o) => !isImportado(o));
  const importados = filtered.filter(isImportado);

  const renderOrders = (list: Order[]) => {
    if (groupByProject) {
      const groupKey = (o: Order) => (o.for_stock ? "__estoque" : (o.project_id ?? "__sem_projeto"));
      const groupLabel = (key: string) => (key === "__estoque" ? "Estoque" : key === "__sem_projeto" ? "—" : projectName(key));
      const grouped = Array.from(
        list.reduce((map, o) => {
          const key = groupKey(o);
          const arr = map.get(key) ?? [];
          arr.push(o);
          map.set(key, arr);
          return map;
        }, new Map<string, Order[]>()).entries()
      ).sort((a, b) => groupLabel(a[0]).localeCompare(groupLabel(b[0])));
      return grouped.map(([pid, plist]) => (
        <div key={pid} className="space-y-2">
          <div className="flex items-center justify-between border-b pb-1">
            <h4 className="text-sm font-semibold">{groupLabel(pid)}</h4>
            <span className="text-xs text-muted-foreground">{plist.length} pedido(s)</span>
          </div>
          <OrdersTable orders={plist} projectName={projectName} requesterName={requesterName} showRequester canEdit canDelete={me?.isAdmin} />
        </div>
      ));
    }
    return <OrdersTable orders={list} projectName={projectName} requesterName={requesterName} showRequester canEdit canDelete={me?.isAdmin} />;
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Fila de compras</CardTitle>
          <CardDescription>Todos os pedidos, separados entre itens nacionais e importados. Atualize status e adicione observações.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Projeto" /></SelectTrigger>
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
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !filtered.length ? (
          <p className="text-sm text-muted-foreground">Nada por aqui.</p>
        ) : (
          <Tabs defaultValue="nacional">
            <TabsList className="mb-4">
              <TabsTrigger value="nacional">Nacional ({nacionais.length})</TabsTrigger>
              <TabsTrigger value="importacao">Importação ({importados.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="nacional">
              {nacionais.length ? (
                renderOrders(nacionais)
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum pedido nesta fila.</p>
              )}
            </TabsContent>
            <TabsContent value="importacao">
              {importados.length ? (
                renderOrders(importados)
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum pedido nesta fila.</p>
              )}
            </TabsContent>
          </Tabs>
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
            <TableHead>Alocação</TableHead>
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
              <TableCell>{o.for_stock ? "Estoque" : o.project_id ? projectName(o.project_id) : "—"}</TableCell>
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
  const [projectId, setProjectId] = useState(order.project_id ?? "");
  const [forStock, setForStock] = useState(order.for_stock ?? false);
  const [files, setFiles] = useState<File[]>([]);
  const [deadlineType, setDeadlineType] = useState<Order["deadline_type"]>(order.deadline_type);
  const [deadlineDate, setDeadlineDate] = useState(order.deadline_date ?? "");
  const { data: purchasableItems } = usePurchasableItems();
  const [itemKey, setItemKey] = useState<string | null>(
    order.material_id
      ? `mat:${order.material_id}`
      : order.terceiros_material_id
        ? `ter:${order.terceiros_material_id}`
        : order.tool_asset_id
          ? `fer:${order.tool_asset_id}`
          : null
  );
  const [itemLink, setItemLink] = useState(order.item_link ?? "");
  const selectedItem = (purchasableItems ?? []).find((i) => i.key === itemKey) ?? null;

  const save = useMutation({
    mutationFn: async (v: z.infer<typeof newOrderSchema>) => {
      let attachments = order.attachments ?? [];
      if (files.length) {
        const uploaded = await uploadOrderAttachments(order.id, files);
        attachments = [...attachments, ...uploaded];
      }
      const { error } = await supabase.from("purchase_orders").update({
        project_id: forStock ? null : (v.project_id ?? null),
        for_stock: forStock,
        item_name: v.item_name,
        item_link: v.item_link ?? null,
        material_id: selectedItem?.material_id ?? null,
        terceiros_material_id: selectedItem?.terceiros_material_id ?? null,
        tool_asset_id: selectedItem?.tool_asset_id ?? null,
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
    if (!selectedItem) {
      return toast.error("Selecione um item cadastrado no Estoque — Fábrica, Insumos de Instalação ou Almoxarifado.");
    }
    if (!forStock && !projectId) {
      return toast.error("Selecione um projeto");
    }
    const fd = new FormData(e.currentTarget);
    const parsed = newOrderSchema.safeParse({
      project_id: forStock ? undefined : projectId,
      item_name: selectedItem.name,
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
            <Label>Alocação</Label>
            <div className="flex items-center gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={!forStock} onCheckedChange={() => setForStock(false)} />
                Projeto
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={forStock} onCheckedChange={() => setForStock(true)} />
                Estoque
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Projeto</Label>
            <Select value={forStock ? "" : projectId} onValueChange={setProjectId} disabled={forStock}>
              <SelectTrigger><SelectValue placeholder={forStock ? "Compra para estoque" : "Selecione o projeto"} /></SelectTrigger>
              <SelectContent>
                {(projects ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Item</Label>
            <PurchasableItemPicker value={selectedItem} onPick={(i) => { setItemKey(i.key); if (i.link) setItemLink(i.link); }} />
            {!selectedItem && (
              <p className="text-xs text-muted-foreground">
                Item atual: {order.item_name} — selecione um item cadastrado para salvar.
              </p>
            )}
          </div>
          <div className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-2">
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
            <Label htmlFor={`e-link-${order.id}`}>Link de Referência <span className="text-muted-foreground">(opcional)</span></Label>
            <Input id={`e-link-${order.id}`} type="url" value={itemLink} onChange={(e) => setItemLink(e.target.value)} placeholder="https://..." />
          </div>
          <AddressAutocomplete name="delivery_point" defaultValue={order.delivery_point} required />

          <div className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-2">
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
  const { data: clients } = useClients();
  const [clientId, setClientId] = useState<string>("none");

  const create = useMutation({
    mutationFn: async (v: { name: string; description: string; client_id: string | null }) => {
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
    create.mutate(
      { name, description, client_id: clientId === "none" ? null : clientId },
      { onSuccess: () => { (e.target as HTMLFormElement).reset(); setClientId("none"); } },
    );
  }

  const clientOf = (p: { client_id?: string | null }) => clients?.find((c) => c.id === p.client_id);

  return (
    <div className="grid gap-6 [&>*]:min-w-0 lg:grid-cols-[1fr_1.5fr]">
      <Card>
        <CardHeader><CardTitle>Novo projeto</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="p-name">Nome do projeto</Label><Input id="p-name" name="name" required /></div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem cliente</SelectItem>
                  {(clients ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
              <TableHeader><TableRow><TableHead>Nome do projeto</TableHead><TableHead>Cliente</TableHead><TableHead>CNPJ</TableHead><TableHead>Descrição</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-sm">{clientOf(p)?.name || p.client_name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{clientOf(p)?.cnpj || p.client_cnpj || "—"}</TableCell>
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

  const allRoles: AppRole[] = ["admin", "comprador", "solicitante", "fabrica"];

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

function BackupButton() {
  const runBackup = useServerFn(exportDatabaseBackup);
  const [loading, setLoading] = useState(false);

  const handleBackup = async () => {
    setLoading(true);
    try {
      const backup = await runBackup();
      const stamp = backup.generatedAt.slice(0, 19).replace(/[:T]/g, "-");
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-myio-${stamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const total = Object.values(backup.tables).reduce((acc, rows) => acc + rows.length, 0);
      toast.success(`Backup baixado: ${total} registros em ${Object.keys(backup.tables).length} tabelas.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar o backup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleBackup} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseBackup className="mr-2 h-4 w-4" />}
      Backup
    </Button>
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