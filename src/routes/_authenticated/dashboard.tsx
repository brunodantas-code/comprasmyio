import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MyioLogo } from "@/components/myio-logo";
import { supabase } from "@/integrations/supabase/client";
import { exportDatabaseBackup } from "@/lib/backup.functions";
import { decideUserDeletion, requestUserDeletion, setUserAccessProfile } from "@/lib/user-admin.functions";
import { lookupLinkPrice } from "@/lib/price-lookup.functions";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { LogOut, Plus, ExternalLink, ClipboardList, ShoppingCart, FolderKanban, Users, ScrollText, Filter, Boxes, Building2, Plane, Landmark, Briefcase } from "lucide-react";
import { Trash2, Paperclip, X, Loader2, DatabaseBackup, CheckCircle2, XCircle, RotateCcw, Pencil, Bell, ShieldCheck } from "lucide-react";
import { ApprovalWorkflow, MyApprovalFlows, PendingForMe } from "@/components/approval-workflow";
import { z } from "zod";
import { StockTab } from "@/components/stock-tab";
import { MyioOrdersTab } from "@/components/myio-orders-tab";
import { ClientsTab, useClients } from "@/components/clients-tab";
import { CostCentersTab, useCostCenters } from "@/components/cost-centers-tab";
import { JobTitlesTab, useJobTitles } from "@/components/job-titles-tab";
import { RemindersTab } from "@/components/reminders-tab";
import { AccessProfilesTab } from "@/components/access-profiles-tab";
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
  request_type: string;
  travel_type: string | null;
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
  request_group_id?: string | null;
  approval_number?: string | null;
  parent_order_id?: string | null;
  payment_date?: string | null;
  approval_status?: string;
  estimated_value?: number;
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
  if (!attachments.length) return null;
  return (
    <ul className="space-y-0.5 text-xs">
      {attachments.map((a) => (
        <li key={a.path} className="flex items-center gap-1">
          <button type="button" onClick={() => openAttachment(a.path)} className="truncate text-primary hover:underline" title={a.name}>
            {a.name}
          </button>
          {canRemove && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-destructive" disabled={remove.isPending} aria-label="Excluir anexo" title="Excluir anexo">
                  <X className="h-3 w-3" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir anexo</AlertDialogTitle>
                  <AlertDialogDescription>
                    Deseja remover o anexo <strong>{a.name}</strong>? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => remove.mutate(a)} disabled={remove.isPending}>
                    {remove.isPending ? "Removendo..." : "Excluir"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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

const STATUS_BADGE_BASE = "bg-slate-200 hover:bg-slate-200 text-slate-700 border-transparent";

const STATUS_CLASSES: Record<Order["status"], string> = {
  pendente: STATUS_BADGE_BASE,
  comprado_aguardando: STATUS_BADGE_BASE,
  entregue: STATUS_BADGE_BASE,
  cancelado: STATUS_BADGE_BASE,
  recebido_ok: STATUS_BADGE_BASE,
  recebido_problema: STATUS_BADGE_BASE,
};

const BUYER_STATUS_KEYS: Order["status"][] = ["pendente", "comprado_aguardando", "entregue", "cancelado"];

const DEADLINE_LABELS: Record<Order["deadline_type"], string> = {
  urgente: "Urgente",
  esta_semana: "Esta semana",
  este_mes: "Este mês",
  customizado: "Data específica",
};

const TRAVEL_TYPE_LABELS: Record<string, string> = {
  passagens: "Passagens",
  hospedagens: "Hospedagens",
  aluguel_veiculos: "Aluguel de Veículos",
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  materiais: "Materiais",
  servicos: "Serviços",
  viagens: "Viagens",
  reembolso: "Reembolso de Despesas",
  rh: "Contratação de RH",
  importacao: "Importação",
  dispositivos: "Dispositivos",
  pagamento: "Pagamento",
};

function requestTypeLabel(o: { request_type?: string | null; travel_type?: string | null }): string {
  const rt = o.request_type ?? "";
  if (rt === "viagens") {
    const sub = o.travel_type ? TRAVEL_TYPE_LABELS[o.travel_type] : undefined;
    return sub ?? "Viagens";
  }
  return REQUEST_TYPE_LABELS[rt] ?? rt ?? "—";
}

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

  const isAdmin = me.isAdmin;
  const canSeeRequests = me.canAccess("solicitacoes");
  const canSeeRegistration = me.canAccess("cadastro");
  const canSeeAdministration = me.canAccess("usuarios");
  const fabricaOnly = me.isFabrica && !isAdmin;
  const estoquistaOnly = me.isEstoquista && !isAdmin && !me.isFabrica;
  const canSeeStock = me.canAccess("armazem");
  const canSeeQueue = me.canAccess("approvals");
  const canImport = me.isComprador || isAdmin;
  const defaultTab = canSeeRequests ? "pedidos" : canSeeQueue ? "queue" : canSeeStock ? "stock" : canSeeRegistration ? "projects" : canSeeAdministration ? "admin" : "pending";


  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:flex sm:justify-between sm:px-6 sm:py-4">
          <Link to="/" className="flex min-w-0 items-center font-semibold">
            <MyioLogo className="text-xl sm:text-2xl" />
          </Link>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="min-w-0 text-right">
              <div className="truncate text-xs font-medium sm:text-sm">{me.full_name || me.email}</div>
              <div className="flex flex-wrap justify-end gap-1">
                <Badge variant="outline" className="text-[10px] uppercase">{me.accessProfile === "padrao" ? "Padrão" : me.accessProfile}</Badge>
                {me.jobTitle ? <Badge variant="outline" className="text-[10px] uppercase">{me.jobTitle.name}</Badge> : null}
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
          <div className="sticky top-[60px] z-40 -mx-3 mb-6 bg-background px-3 py-2 sm:top-[73px] sm:-mx-6 sm:px-6">
          <TabsList>
            {canSeeRequests && <TabsTrigger value="pedidos"><ClipboardList className="mr-2 h-4 w-4" />Solicitações</TabsTrigger>}
            {canSeeQueue && (
              <TabsTrigger value="queue"><ShoppingCart className="mr-2 h-4 w-4" />Approvals</TabsTrigger>
            )}
            {canSeeStock && <TabsTrigger value="stock"><Boxes className="mr-2 h-4 w-4" />Armazém</TabsTrigger>}
            {canSeeRegistration && <TabsTrigger value="projects"><FolderKanban className="mr-2 h-4 w-4" />Cadastro</TabsTrigger>}
            
            
            {canSeeAdministration && <TabsTrigger value="admin"><Users className="mr-2 h-4 w-4" />Usuários e logs</TabsTrigger>}
          </TabsList>
          </div>

          {canSeeRequests && <TabsContent value="pedidos">
            <Tabs defaultValue="mine">
              <TabsList className="mb-4">
                <TabsTrigger value="mine"><ClipboardList className="mr-2 h-4 w-4" />Minhas Solicitações</TabsTrigger>
                <TabsTrigger value="new"><Plus className="mr-2 h-4 w-4" />Novas Solicitações</TabsTrigger>
              </TabsList>
              <TabsContent value="mine"><MyOrders userId={me.id} /></TabsContent>
              <TabsContent value="new"><NewOrder userId={me.id} canImport={canImport} isAdmin={isAdmin} /></TabsContent>
            </Tabs>

          </TabsContent>}
          {canSeeQueue && (
            <TabsContent value="queue">
              <ApprovalsCenter />
            </TabsContent>
          )}
          {canSeeStock && (
            <TabsContent value="stock">
              <StockTab
                userId={me.id}
                canDelete={isAdmin}
                onlyLocation={fabricaOnly ? "fabrica" : estoquistaOnly ? "almoxarifado" : undefined}
              />
            </TabsContent>
          )}
          {canSeeRegistration && (
            <TabsContent value="projects">
              <Tabs defaultValue="projetos">
                <TabsList className="mb-4">
                  <TabsTrigger value="projetos"><FolderKanban className="mr-2 h-4 w-4" />Projetos</TabsTrigger>
                  <TabsTrigger value="clientes"><Building2 className="mr-2 h-4 w-4" />Clientes</TabsTrigger>
                  <TabsTrigger value="centros"><Landmark className="mr-2 h-4 w-4" />Centro de Custo</TabsTrigger>
                  <TabsTrigger value="cargos"><Briefcase className="mr-2 h-4 w-4" />Cargos</TabsTrigger>
                  <TabsTrigger value="lembretes"><Bell className="mr-2 h-4 w-4" />Lembretes</TabsTrigger>
                </TabsList>
                <TabsContent value="projetos"><ProjectsAdmin userId={me.id} /></TabsContent>
                <TabsContent value="clientes"><ClientsTab userId={me.id} /></TabsContent>
                <TabsContent value="centros"><CostCentersTab userId={me.id} /></TabsContent>
                <TabsContent value="cargos"><JobTitlesTab userId={me.id} /></TabsContent>
                <TabsContent value="lembretes"><RemindersTab /></TabsContent>
              </Tabs>
            </TabsContent>
          )}
          {canSeeAdministration && (
            <TabsContent value="admin">
              <Tabs defaultValue="usuarios">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <TabsList>
                    <TabsTrigger value="usuarios"><Users className="mr-2 h-4 w-4" />Usuários</TabsTrigger>
                    <TabsTrigger value="acesso-restrito"><ShieldCheck className="mr-2 h-4 w-4" />Acesso Restrito</TabsTrigger>
                    <TabsTrigger value="workflow"><CheckCircle2 className="mr-2 h-4 w-4" />Approval Workflow</TabsTrigger>
                    <TabsTrigger value="logs"><ScrollText className="mr-2 h-4 w-4" />Logs</TabsTrigger>
                  </TabsList>
                  <BackupButton />
                </div>
                <TabsContent value="usuarios"><UsersAdmin /></TabsContent>
                <TabsContent value="acesso-restrito"><AccessProfilesTab /></TabsContent>
                <TabsContent value="workflow"><ApprovalWorkflow /></TabsContent>
                <TabsContent value="logs"><LogsAdmin /></TabsContent>
              </Tabs>
            </TabsContent>
          )}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Configuração pendente</CardTitle>
                <CardDescription>Seu cadastro foi concluído. Aguarde um Admin definir seu cargo e os menus disponíveis.</CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

const ESTOQUE_PROJECT_ID = "1ff7418a-5542-4ae7-b8af-3f5c9423197e";

function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("name");
      if (error) throw error;
      // O projeto "Estoque" é interno (vinculado ao checkbox Estoque) e não aparece nas listas.
      return (data ?? []).filter((p) => p.id !== ESTOQUE_PROJECT_ID);
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

type NewItemDest = "fabrica" | "almoxarifado" | "terceiros" | "ferramentas";

const NEW_ITEM_DEST_LABELS: Record<NewItemDest, string> = {
  fabrica: "Estoque Fábrica (Insumos de Fabricação)",
  terceiros: "Estoque Myio (Insumos de Instalação)",
  almoxarifado: "Estoque Almoxarifado",
  ferramentas: "Ferramentas e Ativos",
};

async function createNewItemRecord(
  dest: NewItemDest,
  name: string,
  link: string | null,
  userId: string,
): Promise<Pick<PurchasableItem, "material_id" | "terceiros_material_id" | "tool_asset_id">> {
  if (dest === "fabrica" || dest === "almoxarifado") {
    const { data, error } = await supabase
      .from("materials")
      .insert({ name, link, location: dest, is_manufactured: false, created_by: userId })
      .select("id")
      .single();
    if (error) throw error;
    return { material_id: data.id, terceiros_material_id: null, tool_asset_id: null };
  }
  if (dest === "terceiros") {
    const { data, error } = await supabase
      .from("terceiros_materials")
      .insert({ name, link, created_by: userId })
      .select("id")
      .single();
    if (error) throw error;
    return { material_id: null, terceiros_material_id: data.id, tool_asset_id: null };
  }
  const { data, error } = await supabase
    .from("tool_assets")
    .insert({ name, link, created_by: userId })
    .select("id")
    .single();
  if (error) throw error;
  return { material_id: null, terceiros_material_id: null, tool_asset_id: data.id };
}


type PurchasableItem = {
  key: string;
  name: string;
  description: string | null;
  link: string | null;
  manufacturer_code: string | null;
  photo_url: string | null;
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
        supabase.from("materials").select("id, name, description, link, manufacturer_code, photo_url, location").in("location", ["fabrica", "almoxarifado"]).eq("is_manufactured", false).order("name"),
        supabase.from("terceiros_materials").select("id, name, description, link, manufacturer_code, photo_url").order("name"),
        supabase.from("tool_assets").select("id, name, description, link, manufacturer_code, photo_url").order("name"),
      ]);
      if (me) throw me;
      if (te) throw te;
      if (fe) throw fe;
      const items: PurchasableItem[] = [];
      (mats ?? []).forEach((m) =>
        items.push({
          key: `mat:${m.id}`,
          name: m.name,
          description: m.description ?? null,
          link: m.link,
          manufacturer_code: m.manufacturer_code ?? null,
          photo_url: m.photo_url ?? null,
          origin: m.location === "fabrica" ? "Insumos de Fabricação" : "Material de Almoxarifado",
          material_id: m.id,
          terceiros_material_id: null,
          tool_asset_id: null,
        })
      );
      (ters ?? []).forEach((t) =>
        items.push({
          key: `ter:${t.id}`,
          name: t.name,
          description: t.description ?? null,
          link: t.link,
          manufacturer_code: t.manufacturer_code ?? null,
          photo_url: t.photo_url ?? null,
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
          description: t.description ?? null,
          link: t.link,
          manufacturer_code: t.manufacturer_code ?? null,
          photo_url: t.photo_url ?? null,
          origin: "Máquinas e Ferramentas",
          material_id: null,
          terceiros_material_id: null,
          tool_asset_id: t.id,
        })
      );
      return items;
    },
  });
}

/* ---------- Duplicate item detection ---------- */

function normalizeText(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set(["de", "da", "do", "para", "com", "e", "em", "un", "und", "unid", "pc", "pcs"]);

function tokens(s: string) {
  return normalizeText(s).split(" ").filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function similarity(a: string, b: string) {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return 0;
  const setB = new Set(tb);
  let hits = 0;
  ta.forEach((t) => {
    if (setB.has(t) || tb.some((x) => x.startsWith(t) || t.startsWith(x))) hits += 1;
  });
  const overlap = hits / Math.max(ta.length, tb.length);
  const contains = na.includes(nb) || nb.includes(na) ? 0.85 : 0;
  return Math.max(overlap, contains);
}

function findSimilarItems(text: string, items: PurchasableItem[]) {
  if (normalizeText(text).length < 3) return [];
  return items
    .map((i) => ({ item: i, score: Math.max(similarity(text, i.description || ""), similarity(text, i.name)) }))
    .filter((r) => r.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function useItemPhotos(paths: string[]) {
  return useQuery({
    queryKey: ["purchasable-item-photos", paths.slice().sort().join("|")],
    enabled: paths.length > 0,
    queryFn: async () => {
      const { data } = await supabase.storage.from("product-images").createSignedUrls(paths, 60 * 60);
      const map: Record<string, string> = {};
      (data ?? []).forEach((s) => {
        if (s.path && s.signedUrl) map[s.path] = s.signedUrl;
      });
      return map;
    },
  });
}

function DuplicateItemDialog({
  open,
  onOpenChange,
  text,
  candidates,
  onConfirm,
  onReject,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  text: string;
  candidates: PurchasableItem[];
  onConfirm: (i: PurchasableItem) => void;
  onReject: () => void;
}) {
  const paths = candidates.map((c) => c.photo_url).filter((p): p is string => !!p);
  const { data: photos } = useItemPhotos(paths);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Item parecido já cadastrado</DialogTitle>
          <DialogDescription>
            Encontramos {candidates.length === 1 ? "um item já cadastrado" : "itens já cadastrados"} parecido(s) com “{text}”.
            Use o item existente para evitar duplicidade no banco de dados.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {candidates.map((c) => (
            <div key={c.key} className="flex gap-3 rounded-md border p-3">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded border bg-muted/40">
                {c.photo_url && photos?.[c.photo_url] ? (
                  <img src={photos[c.photo_url]} alt={c.description || c.name} className="h-full w-full object-contain" />
                ) : (
                  <span className="text-[10px] text-muted-foreground">Sem foto</span>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium">{c.description || c.name}</p>
                <p className="text-xs text-muted-foreground">{c.origin}</p>
                <p className="text-xs text-muted-foreground">
                  {c.manufacturer_code ? `Cód. Fabricante: ${c.manufacturer_code}` : "Cód. Fabricante: —"}
                </p>
                <Button type="button" size="sm" className="mt-1" onClick={() => onConfirm(c)}>
                  Sim, é este item
                </Button>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onReject}>
            Não, continuar com item novo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
              {value.description || value.name} <span className="text-xs text-muted-foreground">· {value.origin}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Selecione um item cadastrado...</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(28rem,calc(100vw-2rem))] p-0" align="start">
        <div className="flex flex-wrap gap-1 border-b p-2">
          {CATEGORIES.map((c) => (
            <Button
              key={c.value}
              type="button"
              size="sm"
              variant={category === c.value ? "default" : "outline"}
              className="h-7 px-2 text-xs"
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </Button>
          ))}
        </div>
        <Command>
          <CommandInput placeholder="Buscar item cadastrado..." />
          <CommandList>
            <CommandEmpty>{isLoading ? "Carregando..." : "Nenhum item cadastrado nesta categoria."}</CommandEmpty>
            {origins.map((origin) => {
              const list = filtered.filter((i) => i.origin === origin);
              if (!list.length) return null;
              return (
                <CommandGroup key={origin} heading={origin}>
                  {list.map((i) => (
                    <CommandItem
                      key={i.key}
                      value={`${i.description || i.name} (${i.origin})`}
                      onSelect={() => { onPick(i); setOpen(false); }}
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{i.description || i.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {i.manufacturer_code ? `Cód. Fabricante: ${i.manufacturer_code}` : "Cód. Fabricante: —"}
                        </span>
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
  estimated_value: z.coerce.number().min(0, "Valor inválido").max(1000000000),
  recipient: z.string().trim().min(2, "Informe o destinatário").max(200).optional().or(z.literal("").transform(() => undefined)),
  requester_notes: z.string().trim().max(2000).optional().or(z.literal("").transform(() => undefined)),
  delivery_point: z.string().trim().min(3).max(300).optional().or(z.literal("").transform(() => undefined)),
  deadline_type: z.enum(["urgente", "esta_semana", "este_mes", "customizado"]),
  deadline_date: z.string().trim().optional().or(z.literal("").transform(() => undefined)),
}).refine((v) => v.deadline_type !== "customizado" || !!v.deadline_date, {
  message: "Informe a data limite",
  path: ["deadline_date"],
});

async function fetchAvailableStock(item: PurchasableItem): Promise<number> {
  const sum = (rows: { quantity: number; type: string }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + (r.type === "saida" ? -Number(r.quantity) : Number(r.quantity)), 0);
  if (item.material_id) {
    const { data, error } = await supabase.from("stock_movements").select("quantity, type").eq("material_id", item.material_id);
    if (error) throw error;
    return sum(data);
  }
  if (item.terceiros_material_id) {
    const { data, error } = await supabase.from("terceiros_movements").select("quantity, type").eq("material_id", item.terceiros_material_id);
    if (error) throw error;
    return sum(data);
  }
  if (item.tool_asset_id) {
    const { data, error } = await supabase.from("tool_movements").select("quantity, type").eq("material_id", item.tool_asset_id);
    if (error) throw error;
    return sum(data);
  }
  return 0;
}

function useAvgUnitPrice(item: PurchasableItem | null) {
  const idField = item?.material_id
    ? (["material_id", item.material_id] as const)
    : item?.terceiros_material_id
      ? (["terceiros_material_id", item.terceiros_material_id] as const)
      : item?.tool_asset_id
        ? (["tool_asset_id", item.tool_asset_id] as const)
        : null;

  return useQuery({
    queryKey: ["avg-unit-price", idField?.[0], idField?.[1]],
    enabled: !!idField,
    queryFn: async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - 6);
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("estimated_value, quantity, status, created_at")
        .eq(idField![0], idField![1])
        .gte("created_at", since.toISOString());
      if (error) throw error;
      const units = (data ?? [])
        .filter((o) => o.status !== "cancelado" && (o.quantity ?? 0) > 0 && Number(o.estimated_value) > 0)
        .map((o) => Number(o.estimated_value) / Number(o.quantity));
      if (!units.length) return null;
      return { avg: units.reduce((a, b) => a + b, 0) / units.length, count: units.length };
    },
  });
}

function NewOrder({ userId, canImport = false, isAdmin = false }: { userId: string; canImport?: boolean; isAdmin?: boolean }) {
  const { data: projects, isLoading } = useProjects();
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState("");
  const [forStock, setForStock] = useState(false);
  const [requestType, setRequestType] = useState<"materiais" | "servicos" | "viagens" | "reembolso" | "pagamento" | "importacao" | "dispositivos" | "rh">("materiais");
  const [rhCargo, setRhCargo] = useState("");
  const [rhGestor, setRhGestor] = useState("");
  const [rhMotivo, setRhMotivo] = useState("");
  const [rhTipo, setRhTipo] = useState("");
  const [rhRemuneracao, setRhRemuneracao] = useState("0");

  const [allocTarget, setAllocTarget] = useState<"projeto" | "cliente">("projeto");
  const [clientId, setClientId] = useState("");
  const { data: clientsList } = useClients();
  const [costCenterId, setCostCenterId] = useState<string>("");
  const { data: costCenters } = useCostCenters();

  const { data: me } = useCurrentUser();
  const restrictedCc = !!me && !me.isAdmin && (me.accessProfile === "restrito" || me.isEstoquista || me.isFabrica);

  async function resolveOperacaoCostCenterId(): Promise<string> {
    const existing = (costCenters ?? []).find((c) => c.name.trim().toLowerCase() === "operação");
    if (existing) return existing.id;
    const { data, error } = await supabase
      .from("cost_centers")
      .insert({ name: "Operação", code: "OP", description: "Centro de custo padrão de operação", created_by: userId })
      .select("id")
      .single();
    if (error) {
      const { data: retry } = await supabase.from("cost_centers").select("id").ilike("name", "Operação").maybeSingle();
      if (retry) return retry.id;
      throw error;
    }
    qc.invalidateQueries({ queryKey: ["cost_centers"] });
    return data.id;
  }
  const [files, setFiles] = useState<File[]>([]);
  const [deadlineType, setDeadlineType] = useState<Order["deadline_type"]>("esta_semana");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [travelType, setTravelType] = useState("");
  type TravelLeg = { destination: string; departure: string; return: string };
  const [travelLegs, setTravelLegs] = useState<TravelLeg[]>([{ destination: "", departure: "", return: "" }]);
  const updateLeg = (i: number, patch: Partial<TravelLeg>) =>
    setTravelLegs((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const travelDestination = travelLegs[0]?.destination ?? "";
  const travelDeparture = travelLegs[0]?.departure ?? "";
  const travelReturn = travelLegs[0]?.return ?? "";
  type ReembolsoLeg = { description: string; value: string; date: string };
  const [reembolsoLegs, setReembolsoLegs] = useState<ReembolsoLeg[]>([{ description: "", value: "", date: "" }]);
  const updateReembolsoLeg = (i: number, patch: Partial<ReembolsoLeg>) =>
    setReembolsoLegs((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const reembolsoTotal = reembolsoLegs.reduce((acc, l) => acc + (Number(l.value) || 0), 0);
  const [paymentDescription, setPaymentDescription] = useState("");
  const [paymentValue, setPaymentValue] = useState("0");
  const [paymentDate, setPaymentDate] = useState("");
  const [linkedApprovalId, setLinkedApprovalId] = useState("none");
  const { data: approvedOrders } = useQuery({
    queryKey: ["orders", "approved-for-payment"],
    enabled: requestType === "pagamento",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("id, approval_number, item_name, request_type, travel_type, created_at")
        .eq("approval_status", "aprovado")
        .neq("request_type", "pagamento")
        .is("parent_order_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const [item, setItem] = useState<PurchasableItem | null>(null);
  const [itemLink, setItemLink] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("0");
  const [qty, setQty] = useState("1");
  const [lookingUpPrice, setLookingUpPrice] = useState(false);
  const [isNewItem, setIsNewItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemDest, setNewItemDest] = useState<NewItemDest | "">("");

  const lastLookupRef = useRef<string>("");
  const lookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tryAutoFillPrice = async (url: string) => {
    const trimmed = url.trim();
    if (!/^https?:\/\/.+\..+/.test(trimmed)) return;
    if (lastLookupRef.current === trimmed) return;
    lastLookupRef.current = trimmed;
    setLookingUpPrice(true);
    try {
      const { price } = await lookupLinkPrice({ data: { url: trimmed } });
      if (price) {
        setEstimatedValue(String(price));
        toast.success(`Valor estimado preenchido automaticamente: R$ ${price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
      } else {
        toast.info("Não consegui ler o preço nesse site. Informe o valor estimado manualmente.");
      }
    } finally {
      setLookingUpPrice(false);
    }
  };

  const scheduleAutoFillPrice = (url: string) => {
    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    lookupTimerRef.current = setTimeout(() => void tryAutoFillPrice(url), 700);
  };


  const [recipient, setRecipient] = useState("");
  const { data: profiles } = useProfilesList();
  const { data: jobTitles } = useJobTitles();
  const { data: purchasables } = usePurchasableItems();
  const [dupOpen, setDupOpen] = useState(false);
  const [dupCandidates, setDupCandidates] = useState<PurchasableItem[]>([]);
  const [dismissedText, setDismissedText] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);
  const [checking, setChecking] = useState(false);
  const [split, setSplit] = useState<{
    values: z.infer<typeof newOrderSchema>;
    available: number;
    shipQty: number;
    buyQty: number;
  } | null>(null);

  const checkDuplicates = (text: string) => {
    if (!isNewItem) return false;
    if (normalizeText(text) === normalizeText(dismissedText)) return false;
    const found = findSimilarItems(text, purchasables ?? []).map((r) => r.item);
    if (!found.length) return false;
    setDupCandidates(found);
    setDupOpen(true);
    return true;
  };

  const resetForm = () => {
    formRef.current?.reset();
    setProjectId("");
    setForStock(false);
    setRequestType("materiais");
    setAllocTarget("projeto");
    setClientId("");

    setFiles([]);
    setDeadlineType("esta_semana");
    setDeadlineDate("");
    setTravelType("");
    setTravelLegs([{ destination: "", departure: "", return: "" }]);
    setReembolsoLegs([{ description: "", value: "", date: "" }]);
    setPaymentDescription("");
    setPaymentValue("0");
    setPaymentDate("");
    setLinkedApprovalId("none");
    setItem(null);
    setItemLink("");
    setEstimatedValue("0");
    setQty("1");
    setIsNewItem(false);
    setNewItemName("");
    setNewItemDest("");
    setRecipient("");
    setCostCenterId("");
    setRhCargo("");
    setRhGestor("");
    setRhMotivo("");
    setRhTipo("");
    setRhRemuneracao("0");

  };

  const avgPrice = useAvgUnitPrice(isNewItem ? null : item);

  const submit = useMutation({
    mutationFn: async ({ values, buyQty, shipQty }: { values: z.infer<typeof newOrderSchema>; buyQty: number; shipQty: number }) => {
      let ids = {
        material_id: isNewItem ? null : (item?.material_id ?? null),
        terceiros_material_id: isNewItem ? null : (item?.terceiros_material_id ?? null),
        tool_asset_id: isNewItem ? null : (item?.tool_asset_id ?? null),
      };
      if (isNewItem && requestType === "materiais") {
        if (!newItemDest) throw new Error("Selecione o estoque de destino do item novo.");
        ids = await createNewItemRecord(newItemDest, values.item_name, values.item_link ?? null, userId);
      }

      const requestGroupId = crypto.randomUUID();
      if (shipQty > 0) {

        const { data: exp, error: expError } = await supabase
          .from("myio_orders")
          .insert({
            title: values.item_name,
            client_name: forStock ? "Estoque" : (projects?.find((p) => p.id === values.project_id)?.name ?? ""),
            project_id: forStock ? null : (values.project_id ?? null),
            delivery_date: values.deadline_type === "customizado" && values.deadline_date
              ? values.deadline_date
              : new Date().toISOString().slice(0, 10),
            notes: `Gerado a partir de solicitação (${shipQty} em estoque). Destinatário: ${values.recipient}. Entrega: ${values.delivery_point}.`,
            created_by: userId,
            request_group_id: requestGroupId,
          })
          .select("id")
          .single();
        if (expError) throw expError;
        const { error: itemsError } = await supabase
          .from("myio_order_items")
          .insert({ order_id: exp.id, product: values.item_name, quantity: shipQty });
        if (itemsError) throw itemsError;
      }

      if (buyQty > 0) {
        const { data, error } = await supabase.from("purchase_orders").insert({
          project_id: forStock ? null : (values.project_id ?? null),
          for_stock: forStock,
          request_type: requestType,
          client_id: requestType === "rh" || requestType === "pagamento"
            ? (clientId && clientId !== "none" ? clientId : null)
            : (requestType !== "materiais" && allocTarget === "cliente" ? (clientId || null) : null),
          cost_center_id: restrictedCc ? await resolveOperacaoCostCenterId() : (costCenterId || null),
          parent_order_id: requestType === "pagamento" && linkedApprovalId !== "none" ? linkedApprovalId : null,
          payment_date: requestType === "pagamento" ? paymentDate : null,

          item_name: values.item_name,
          item_link: values.item_link ?? null,
          request_group_id: requestGroupId,
          material_id: ids.material_id,
          terceiros_material_id: ids.terceiros_material_id,
          tool_asset_id: ids.tool_asset_id,

          quantity: buyQty,
          estimated_value: Number((values.estimated_value * buyQty).toFixed(2)),
          recipient: values.recipient,
          requester_notes: values.requester_notes ?? null,
          delivery_point: values.delivery_point ?? null,
          deadline_type: values.deadline_type,
          deadline_date: values.deadline_type === "customizado" ? (values.deadline_date ?? null) : null,
          travel_type: requestType === "viagens" ? travelType : null,
          travel_destination: requestType === "viagens" ? travelDestination.trim() : null,
          travel_departure: requestType === "viagens" ? travelDeparture : null,
          travel_return: requestType === "viagens" ? travelReturn : null,
          travel_legs: requestType === "viagens"
            ? travelLegs.map((l) => ({ destination: l.destination.trim(), departure: l.departure, return: l.return }))
            : requestType === "reembolso"
            ? reembolsoLegs.map((l) => ({ description: l.description.trim(), value: Number(l.value), date: l.date }))
            : requestType === "rh"
            ? [{ cargo: rhCargo, gestor: rhGestor, motivo: rhMotivo.trim(), tipo: rhTipo, remuneracao: Number(rhRemuneracao) }]
            : requestType === "pagamento"
            ? [{ description: paymentDescription.trim(), value: Number(paymentValue), date: paymentDate }]
            : [],
          requester_id: userId,
        }).select("id").single();
        if (error) throw error;
        if (files.length && data?.id) {
          const uploaded = await uploadOrderAttachments(data.id, files);
          const { error: ue } = await supabase.from("purchase_orders").update({ attachments: uploaded }).eq("id", data.id);
          if (ue) throw ue;
        }
      }
      return { buyQty, shipQty };
    },
    onSuccess: (r) => {
      if (r.shipQty > 0 && r.buyQty > 0) toast.success(`Ordem de expedição (${r.shipQty}) e ordem de compra (${r.buyQty}) criadas.`);
      else if (r.shipQty > 0) toast.success(`Atendido pelo estoque: ordem de expedição de ${r.shipQty} criada.`);
      else toast.success("Pedido criado!");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["myio-orders"] });
      qc.invalidateQueries({ queryKey: ["purchasable-items"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["stock-meta"] });
      qc.invalidateQueries({ queryKey: ["terceiros-stock"] });
      qc.invalidateQueries({ queryKey: ["tool-stock"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const isMateriais = requestType === "materiais";
    const isReembolso = requestType === "reembolso";
    const isRh = requestType === "rh";
    const isPagamento = requestType === "pagamento";
    if (!isMateriais) {
      if (!isReembolso && !isRh && !isPagamento && newItemName.trim().length < 2) return toast.error("Descreva o serviço ou a viagem solicitada.");
      if (!isRh && !isPagamento && allocTarget === "projeto" && !projectId) return toast.error("Selecione o projeto");
      if (!isRh && !isPagamento && allocTarget === "cliente" && !clientId) return toast.error("Selecione o cliente");
      if (isRh) {
        if (!rhCargo) return toast.error("Selecione o cargo");
        if (!rhGestor) return toast.error("Selecione o gestor");
        if (!rhTipo) return toast.error("Selecione o tipo de contratação");
        if (rhMotivo.trim().length < 3) return toast.error("Informe o motivo da contratação");
        if (!(Number(rhRemuneracao) > 0)) return toast.error("Informe a remuneração");
      }
      if (requestType === "viagens") {
        if (!travelType) return toast.error("Selecione o tipo de viagem");
        for (let i = 0; i < travelLegs.length; i++) {
          const leg = travelLegs[i];
          const n = i + 1;
          const isRental = travelType === "aluguel_veiculos";
          const destLabel = isRental ? "a cidade e a UF de retirada" : "a cidade e o estado de destino";
          const depLabel = isRental ? "a data de retirada" : "a data de ida";
          const retLabel = isRental ? "a data de devolução" : "a data de retorno";
          if (leg.destination.trim().length < 2) return toast.error(`Solicitação ${n}: informe ${destLabel}`);
          if (!leg.departure) return toast.error(`Solicitação ${n}: informe ${depLabel}`);
          if (!leg.return) return toast.error(`Solicitação ${n}: informe ${retLabel}`);
          if (leg.return < leg.departure) return toast.error(`Solicitação ${n}: ${retLabel} não pode ser anterior a ${depLabel}`);
        }
      }
      if (isReembolso) {
        for (let i = 0; i < reembolsoLegs.length; i++) {
          const leg = reembolsoLegs[i];
          const n = i + 1;
          if (leg.description.trim().length < 2) return toast.error(`Reembolso ${n}: informe a descrição da despesa`);
          if (!(Number(leg.value) > 0)) return toast.error(`Reembolso ${n}: informe um valor válido`);
          if (!leg.date) return toast.error(`Reembolso ${n}: informe a data da despesa`);
        }
      }
      if (isPagamento) {
        if (!costCenterId && !restrictedCc) return toast.error("Selecione o Centro de Custo");
        if (paymentDescription.trim().length < 2) return toast.error("Informe a descrição do pagamento");
        if (!(Number(paymentValue) > 0)) return toast.error("Informe um valor válido para o pagamento");
        if (!paymentDate) return toast.error("Informe a data do pagamento");
      }
    } else if (isNewItem) {
      if (newItemName.trim().length < 2) return toast.error("Descreva o item novo.");
      if (!newItemDest) return toast.error("Selecione para qual estoque esse item novo será cadastrado.");
      if (checkDuplicates(newItemName)) return;
      
    } else if (!item) {
      return toast.error("Selecione um item cadastrado: Insumos de Fabricação, Insumos de Instalação, Material de Almoxarifado ou Máquinas e Ferramentas.");
    }
    if (isMateriais && !forStock && !projectId) {
      return toast.error("Selecione um projeto");
    }
    if (isMateriais && !recipient.trim()) {
      return toast.error("Selecione o destinatário");
    }

    const fd = new FormData(e.currentTarget);
    const parsed = newOrderSchema.safeParse({
      project_id: isRh || isPagamento ? (projectId || undefined) : (!isMateriais ? (allocTarget === "projeto" ? projectId : undefined) : (forStock ? undefined : projectId)),
      item_name: isReembolso
        ? "Reembolso de Despesas"
        : isPagamento
        ? paymentDescription.trim()
        : isRh
        ? `Contratação de RH — ${rhCargo}`
        : (!isMateriais || isNewItem ? newItemName : item!.name),
      item_link: isReembolso || isRh || isPagamento ? undefined : (itemLink || undefined),
      quantity: isReembolso || isRh || isPagamento ? 1 : (Number(qty) || 1),
      estimated_value: isReembolso ? reembolsoTotal : isRh ? Number(rhRemuneracao || 0) : isPagamento ? Number(paymentValue) : (Number(estimatedValue) || 0),
      recipient: isRh ? rhGestor : isPagamento ? "Financeiro" : recipient,
      requester_notes: isRh
        ? `${rhTipo === "reposicao" ? "Reposição" : "Nova Contratação"} — Motivo: ${rhMotivo.trim()}${fd.get("requester_notes") ? ` | ${fd.get("requester_notes")}` : ""}`
        : (fd.get("requester_notes") || undefined),
      delivery_point: (fd.get("delivery_point") as string | null) || undefined,
      deadline_type: deadlineType,
      deadline_date: deadlineDate || undefined,
    });
    if (!parsed.success) {
      const iss = parsed.error.issues[0];
      const labels: Record<string, string> = {
        item_name: "Descrição",
        item_link: "Link de referência",
        quantity: "Quantidade",
        estimated_value: "Valor unitário estimado",
        recipient: "Destinatário",
        requester_notes: "Observações",
        delivery_point: "Endereço de entrega",
        deadline_date: "Data limite",
        project_id: "Projeto",
      };
      const field = labels[String(iss.path[0] ?? "")];
      return toast.error(field ? `${field}: ${iss.message}` : iss.message);
    }

    if (isMateriais && !isNewItem && item) {

      setChecking(true);
      try {
        const available = Math.max(0, Math.floor(await fetchAvailableStock(item)));
        if (available > 0) {
          const shipQty = Math.min(available, parsed.data.quantity);
          setSplit({ values: parsed.data, available, shipQty, buyQty: parsed.data.quantity - shipQty });
          return;
        }
      } catch (err) {
        toast.error((err as Error).message);
        return;
      } finally {
        setChecking(false);
      }
    }

    submit.mutate({ values: parsed.data, buyQty: parsed.data.quantity, shipQty: 0 }, { onSuccess: resetForm });
  }


  const typeSelector = (
    <div className="space-y-2">
      <Label>Tipo de solicitação</Label>
      <Select
        value={requestType}
        onValueChange={(v) => {
          const t = v as typeof requestType;
          setRequestType(t);
          if (t === "materiais") {
            setClientId("");
          } else {
            setForStock(false);
            setIsNewItem(true);
            setItem(null);
            setNewItemDest("");
          }
        }}
      >
        <SelectTrigger className="w-full sm:w-72"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
        <SelectContent>
          {([
            ["materiais", "Materiais"],
            ["servicos", "Serviços"],
            ["viagens", "Viagens"],
            ["reembolso", "Reembolsos"],
            ["pagamento", "Pagamento"],
            ["rh", "Contratação de RH"],
            ...(canImport ? [["importacao", "Importação"] as const] : []),
            ...(isAdmin ? [["dispositivos", "Dispositivos"] as const] : []),
          ] as const).map(([v, l]) => (
            <SelectItem key={v} value={v}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {requestType === "materiais" && (
        <p className="text-xs text-muted-foreground">Solicitações de Materiais são cadastradas no Armazém.</p>
      )}
      {requestType === "viagens" && (
        <p className="text-xs text-muted-foreground">Passagens, Hospedagens, Aluguel de Veículos.</p>
      )}
      {requestType === "reembolso" && (
        <p className="text-xs text-muted-foreground">Reembolso de despesas incorridas pelo solicitante.</p>
      )}
      {requestType === "pagamento" && (
        <p className="text-xs text-muted-foreground">Solicitação única de pagamento, com vínculo opcional a um Approval já aprovado.</p>
      )}
      {requestType === "importacao" && (
        <p className="text-xs text-muted-foreground">Pedidos de importação e acompanhamento de embarques.</p>
      )}
      {requestType === "dispositivos" && (
        <p className="text-xs text-muted-foreground">Solicitações de dispositivos Myio para projetos.</p>
      )}
      {requestType === "rh" && (
        <p className="text-xs text-muted-foreground">Solicitação de contratação de pessoal (reposição ou nova vaga).</p>
      )}
    </div>
  );

  if (requestType === "importacao") {
    return (
      <div className="space-y-4">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Novas Solicitações</CardTitle>
          </CardHeader>
          <CardContent>{typeSelector}</CardContent>
        </Card>
        <ImportOrders userId={userId} />
      </div>
    );
  }

  if (requestType === "dispositivos") {
    return (
      <div className="space-y-4">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Novas Solicitações</CardTitle>
          </CardHeader>
          <CardContent>{typeSelector}</CardContent>
        </Card>
        <MyioOrdersTab userId={userId} canManage={isAdmin} />
      </div>
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Novas Solicitações</CardTitle>
        
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando projetos...</p>
        ) : !projects?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum projeto disponível. Peça a um admin para criar um.</p>
        ) : (
          <form ref={formRef} onSubmit={onSubmit} className="space-y-4">

            {typeSelector}



            {requestType === "viagens" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>O que você deseja solicitar?</Label>
                  <Select value={travelType} onValueChange={setTravelType}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passagens">Passagens</SelectItem>
                      <SelectItem value="hospedagens">Hospedagens</SelectItem>
                      <SelectItem value="aluguel_veiculos">Aluguel de Veículos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {requestType === "viagens" && (
              <div className="space-y-3">
                {travelLegs.map((leg, i) => (
                  <div key={i} className="rounded-md border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Solicitação {i + 1}</span>
                      {travelLegs.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setTravelLegs((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-4 md:grid-cols-3 items-end">
                      <div className="space-y-2">
                        <Label htmlFor={`travel_destination_${i}`}>{travelType === "aluguel_veiculos" ? "Cidade e UF de retirada" : "Cidade e UF de destino"}</Label>
                        <Input id={`travel_destination_${i}`} value={leg.destination} onChange={(e) => updateLeg(i, { destination: e.target.value })} placeholder="Ex.: São Paulo - SP" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`travel_departure_${i}`}>{travelType === "aluguel_veiculos" ? "Data de retirada" : "Data de ida"}</Label>
                        <Input id={`travel_departure_${i}`} type="date" value={leg.departure} onChange={(e) => updateLeg(i, { departure: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`travel_return_${i}`}>{travelType === "aluguel_veiculos" ? "Data de devolução" : "Data de retorno"}</Label>
                        <Input id={`travel_return_${i}`} type="date" value={leg.return} min={leg.departure || undefined} onChange={(e) => updateLeg(i, { return: e.target.value })} />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setTravelLegs((prev) => [...prev, { destination: "", departure: "", return: "" }])}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">Deseja adicionar outra solicitação para esta viagem?</span>
                </div>
              </div>
            )}

            {requestType === "reembolso" && (
              <div className="space-y-3">
                {reembolsoLegs.map((leg, i) => (
                  <div key={i} className="rounded-md border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Reembolso {i + 1}</span>
                      {reembolsoLegs.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setReembolsoLegs((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-4 md:grid-cols-3 items-end">
                      <div className="space-y-2 md:col-span-1">
                        <Label htmlFor={`reembolso_desc_${i}`}>Descrição da despesa</Label>
                        <Input id={`reembolso_desc_${i}`} value={leg.description} onChange={(e) => updateReembolsoLeg(i, { description: e.target.value })} placeholder="Ex.: Taxi ao aeroporto" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`reembolso_value_${i}`}>Valor (R$)</Label>
                        <MoneyInput id={`reembolso_value_${i}`} className="w-32" value={leg.value} onChange={(v) => updateReembolsoLeg(i, { value: v })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`reembolso_date_${i}`}>Data da despesa</Label>
                        <Input id={`reembolso_date_${i}`} type="date" value={leg.date} onChange={(e) => updateReembolsoLeg(i, { date: e.target.value })} />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setReembolsoLegs((prev) => [...prev, { description: "", value: "", date: "" }])}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">Deseja adicionar outro reembolso a esta Solicitação?</span>
                </div>
              </div>
            )}

            {requestType === "pagamento" && (
              <div className="rounded-md border p-3 space-y-4">
                <div className="space-y-2">
                  <Label>Vincular Approval aprovado <span className="text-muted-foreground">(opcional)</span></Label>
                  <Select value={linkedApprovalId} onValueChange={setLinkedApprovalId}>
                    <SelectTrigger><SelectValue placeholder="Sem Approval vinculado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem Approval vinculado</SelectItem>
                      {(approvedOrders ?? []).map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.approval_number ?? "Sem número"} — {requestTypeLabel(o)} — {o.item_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 md:grid-cols-3 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="payment_description">Descrição do pagamento</Label>
                    <Input id="payment_description" value={paymentDescription} onChange={(e) => setPaymentDescription(e.target.value)} placeholder="Ex.: Pagamento de fornecedor" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_value">Valor (R$)</Label>
                    <MoneyInput id="payment_value" className="w-32" value={paymentValue} onChange={setPaymentValue} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_date">Data do pagamento</Label>
                    <Input id="payment_date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {requestType === "rh" && (
              <div className="rounded-md border p-3 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Cargo</Label>
                    <Select value={rhCargo} onValueChange={setRhCargo}>
                      <SelectTrigger><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
                      <SelectContent>
                        {(jobTitles ?? []).map((t) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Gestor</Label>
                    <Select value={rhGestor} onValueChange={setRhGestor}>
                      <SelectTrigger><SelectValue placeholder="Selecione o gestor" /></SelectTrigger>
                      <SelectContent>
                        {(profiles ?? []).map((p) => (
                          <SelectItem key={p.id} value={p.full_name || p.email || p.id}>
                            {p.full_name || p.email || p.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={rhTipo} onValueChange={setRhTipo}>
                      <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reposicao">Reposição</SelectItem>
                        <SelectItem value="nova">Nova Contratação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rh_remuneracao">Remuneração (R$)</Label>
                    <MoneyInput id="rh_remuneracao" className="w-32" value={rhRemuneracao} onChange={setRhRemuneracao} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rh_motivo">Motivo da contratação</Label>
                  <Textarea id="rh_motivo" value={rhMotivo} onChange={(e) => setRhMotivo(e.target.value)} placeholder="Explique o motivo da contratação" />
                </div>
                <p className="text-xs text-muted-foreground">Anexe o arquivo de Job Description no campo de anexos abaixo.</p>
              </div>
            )}

            <div className="space-y-2">
            </div>

            {requestType === "rh" || requestType === "pagamento" ? (
              <>
                {!restrictedCc && (
                  <div className="space-y-2">
                    <Label>Centro de Custo</Label>
                    <Select value={costCenterId} onValueChange={setCostCenterId}>
                      <SelectTrigger><SelectValue placeholder="Selecione o centro de custo" /></SelectTrigger>
                      <SelectContent>
                        {(costCenters ?? []).filter((c) => c.active).map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.code ? `${c.code} — ${c.name}` : c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Cliente <span className="text-muted-foreground">(opcional)</span></Label>
                  <Select value={clientId || "none"} onValueChange={setClientId}>
                    <SelectTrigger><SelectValue placeholder="Sem cliente definido" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem cliente definido</SelectItem>
                      {(clientsList ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {requestType === "pagamento" && (
                  <div className="space-y-2">
                    <Label>Projeto <span className="text-muted-foreground">(opcional)</span></Label>
                    <Select value={projectId || "none"} onValueChange={(v) => setProjectId(v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Sem projeto definido" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem projeto definido</SelectItem>
                        {projects.filter((p) => !p.status || p.status === "active").map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            ) : requestType === "materiais" ? (
              <>
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
                  {!restrictedCc && (
                    <div className="pt-2">
                      <Label>Centro de Custo</Label>
                      <Select value={costCenterId} onValueChange={setCostCenterId}>
                        <SelectTrigger className="mt-2"><SelectValue placeholder="Selecione o centro de custo" /></SelectTrigger>
                        <SelectContent>
                          {(costCenters ?? []).filter((c) => c.active).map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.code ? `${c.code} — ${c.name}` : c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Projeto</Label>
                  <Select value={forStock ? "" : projectId} onValueChange={setProjectId} disabled={forStock}>
                    <SelectTrigger><SelectValue placeholder={forStock ? "Compra para estoque" : "Selecione o projeto"} /></SelectTrigger>
                    <SelectContent>
                      {projects.filter((p) => !p.status || p.status === "active").map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Alocação</Label>
                  <div className="flex items-center gap-6">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox checked={allocTarget === "projeto"} onCheckedChange={() => { setAllocTarget("projeto"); setClientId(""); }} />
                      Projeto
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox checked={allocTarget === "cliente"} onCheckedChange={() => { setAllocTarget("cliente"); setProjectId(""); }} />
                      Cliente
                    </label>
                  </div>
                  {!restrictedCc && (
                    <div className="pt-2">
                      <Label>Centro de Custo</Label>
                      <Select value={costCenterId} onValueChange={setCostCenterId}>
                        <SelectTrigger className="mt-2"><SelectValue placeholder="Selecione o centro de custo" /></SelectTrigger>
                        <SelectContent>
                          {(costCenters ?? []).filter((c) => c.active).map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.code ? `${c.code} — ${c.name}` : c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                {allocTarget === "projeto" ? (
                  <div className="space-y-2">
                    <Label>Projeto</Label>
                    <Select value={projectId} onValueChange={setProjectId}>
                      <SelectTrigger><SelectValue placeholder="Selecione o projeto" /></SelectTrigger>
                      <SelectContent>
                        {projects.filter((p) => !p.status || p.status === "active").map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select value={clientId} onValueChange={setClientId}>
                      <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                      <SelectContent>
                        {(clientsList ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {requestType !== "reembolso" && requestType !== "rh" && requestType !== "pagamento" && (
            <div className="space-y-2">
              {requestType === "materiais" ? (
                <>
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
                </>
              ) : requestType === "servicos" ? (
                <Label>Serviço</Label>
              ) : null}
              {isNewItem ? (

                <div className="space-y-2 pt-1">
                  <Label htmlFor="new_item_name">
                    {requestType === "materiais" ? "Descrição do item" : requestType === "servicos" ? "Descrição do serviço" : "Descrição da viagem"}
                  </Label>
                  <Input
                    id="new_item_name"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onBlur={(e) => { if (requestType === "materiais") checkDuplicates(e.target.value); }}
                    placeholder={requestType === "materiais" ? "Descreva o item que precisa ser comprado" : requestType === "servicos" ? "Descreva o serviço contratado" : "Descreva a viagem (destino, período, motivo)"}
                  />
                  {requestType === "materiais" && (
                  <div className="space-y-2 pt-1">
                    <Label>Cadastrar em qual estoque?</Label>
                    <Select value={newItemDest} onValueChange={(v) => setNewItemDest(v as NewItemDest)}>
                      <SelectTrigger><SelectValue placeholder="Selecione o estoque de destino" /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(NEW_ITEM_DEST_LABELS) as NewItemDest[]).map((d) => (
                          <SelectItem key={d} value={d}>{NEW_ITEM_DEST_LABELS[d]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      O item será cadastrado nesse banco e a entrada acontece automaticamente ao receber.
                    </p>
                  </div>
                  )}


                  <DuplicateItemDialog
                    open={dupOpen}
                    onOpenChange={setDupOpen}
                    text={newItemName}
                    candidates={dupCandidates}
                    onConfirm={(i) => {
                      setIsNewItem(false);
                      setNewItemName("");
                      setItem(i);
                      if (i.link) setItemLink(i.link);
                      setDupOpen(false);
                      toast.success("Item cadastrado selecionado.");
                    }}
                    onReject={() => {
                      setDismissedText(newItemName);
                      setDupOpen(false);
                    }}
                  />
                </div>
              ) : (

                <p className="text-xs text-muted-foreground">
                  Somente itens cadastrados em Insumos de Fabricação, Insumos de Instalação, Material de Almoxarifado ou Máquinas e Ferramentas. Ao receber, entra automaticamente no estoque de origem.
                </p>
              )}
            </div>
            )}
            {requestType !== "reembolso" && requestType !== "rh" && requestType !== "pagamento" && (
            <div className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quantity">{requestType === "viagens" ? (travelType === "aluguel_veiculos" ? "Quantidade de veículos" : "Quantidade de Pessoas") : "Quantidade"}</Label>
                <Input id="quantity" name="quantity" type="number" min={1} max={99999} className="w-20" value={qty} onChange={(e) => setQty(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated_value">Valor unitário estimado (R$)</Label>
                <div className="relative">
                  <MoneyInput id="estimated_value" name="estimated_value" className="w-32 pr-8" value={estimatedValue} onChange={setEstimatedValue} required />
                  {lookingUpPrice && <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimated_total">Valor Total Estimado (R$)</Label>
                  <Input
                    id="estimated_total"
                    readOnly
                    tabIndex={-1}
                    className="bg-muted"
                    value={`R$ ${(Number(estimatedValue || 0) * Number(qty || 1)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  />
                </div>
              </div>
              {!isNewItem && item && (
                <div className="space-y-2">
                  <Label>Valor médio (últimos 6 meses)</Label>
                  <Input
                    readOnly
                    tabIndex={-1}
                    className="bg-muted"
                    value={
                      avgPrice.isLoading
                        ? "Calculando..."
                        : avgPrice.data
                          ? `R$ ${avgPrice.data.avg.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / unid.`
                          : "Sem compras nos últimos 6 meses"
                    }
                  />
                  {avgPrice.data && (
                    <p className="text-xs text-muted-foreground">
                      Média de {avgPrice.data.count} compra{avgPrice.data.count > 1 ? "s" : ""} deste item.
                    </p>
                  )}
                </div>
              )}
              {requestType === "materiais" && (
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
              )}
            </div>
            )}
            {requestType !== "reembolso" && requestType !== "rh" && requestType !== "pagamento" && (
            <div className="space-y-2">
              <Label htmlFor="item_link">
                Link de Referência <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input id="item_link" type="url" placeholder="https://..." value={itemLink} onChange={(e) => { setItemLink(e.target.value); scheduleAutoFillPrice(e.target.value); }} onPaste={(e) => { const t = e.clipboardData.getData("text"); if (t) setTimeout(() => void tryAutoFillPrice(t), 0); }} onBlur={() => void tryAutoFillPrice(itemLink)} />
            </div>
            )}
            {requestType === "materiais" && <AddressAutocomplete name="delivery_point" required />}

            {requestType !== "reembolso" && requestType !== "rh" && requestType !== "pagamento" && (
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
            )}
            <div className="space-y-2">
              <Label htmlFor="requester_notes">Observações <span className="text-muted-foreground">(opcional)</span></Label>
              <Textarea id="requester_notes" name="requester_notes" placeholder="Detalhes adicionais para o time de supply" />
            </div>
            <FilePicker files={files} setFiles={setFiles} />
            <Button type="submit" disabled={submit.isPending || checking}>
              {checking ? "Verificando estoque..." : submit.isPending ? "Enviando..." : "Salvar"}
            </Button>
          </form>
        )}
        <Dialog open={!!split} onOpenChange={(o) => { if (!o) setSplit(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Item disponível em estoque</DialogTitle>
              <DialogDescription>
                Encontramos {split?.available} unid. em estoque de “{split?.values.item_name}”.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <p>Solicitado: <strong>{split?.values.quantity}</strong> unid.</p>
              <p>Ordem de expedição (estoque): <strong>{split?.shipQty}</strong> unid.</p>
              <p>Ordem de compra (diferença): <strong>{split?.buyQty}</strong> unid.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSplit(null)}>Cancelar</Button>
              <Button
                type="button"
                disabled={submit.isPending}
                onClick={() => {
                  if (!split) return;
                  submit.mutate(
                    { values: split.values, buyQty: split.buyQty, shipQty: split.shipQty },
                    { onSuccess: () => { setSplit(null); resetForm(); } }
                  );
                }}
              >
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>

  );
}

/* ---------- My orders ---------- */

type StockPart = { qty: number; status: string; title: string; group: string };

function useMyStockParts(userId: string) {
  return useQuery({
    queryKey: ["orders", "mine-stock-parts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("myio_orders")
        .select("id, title, status, request_group_id, myio_order_items(quantity)")
        .eq("created_by", userId)
        .not("request_group_id", "is", null);
      if (error) throw error;
      const map = new Map<string, StockPart>();
      for (const o of data ?? []) {
        const qty = (o.myio_order_items ?? []).reduce((s: number, i: { quantity: number }) => s + (i.quantity ?? 0), 0);
        if (!o.request_group_id) continue;
        map.set(o.request_group_id, { qty, status: o.status as string, title: o.title, group: o.request_group_id });
      }
      return map;
    },
  });
}

const MYIO_STATUS_LABELS: Record<string, string> = {
  pendente: "Aguardando separação",
  produzindo: "Em produção",
  pronto_entrega: "Pronto para retirada",
  entregue_cliente: "Entregue",
  em_transito: "Em trânsito",
  perdido: "Perdido",
};

function MyOrders({ userId }: { userId: string }) {
  const { data: projects } = useProjects();
  const { data: stockParts } = useMyStockParts(userId);
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

  const projectName = (id: string) => (id === ESTOQUE_PROJECT_ID ? "Estoque" : projects?.find((p) => p.id === id)?.name ?? "—");
  const visible = orders ?? [];

  const usedGroups = new Set((orders ?? []).map((o) => o.request_group_id).filter(Boolean) as string[]);
  const stockOnly = [...(stockParts?.values() ?? [])].filter((p) => !usedGroups.has(p.group));

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Minhas Solicitações</CardTitle>
          <CardDescription>Acompanhe o status dos seus pedidos de compra.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
          !orders?.length ? <p className="text-sm text-muted-foreground">Nenhum pedido ainda.</p> :
          !visible.length ? <p className="text-sm text-muted-foreground">Nenhum pedido para exibir com o filtro atual.</p> :
          <OrdersTable orders={visible} projectName={projectName} showRequester={false} canEditRequester canDelete stockParts={stockParts} headerFilters />
        }
        {stockOnly.length > 0 && (
          <div className="rounded-md border p-4">
            <p className="text-sm font-medium">Separação do estoque</p>
            <p className="mb-2 text-xs text-muted-foreground">Solicitações atendidas integralmente pelo estoque — retire com o estoquista.</p>
            <ul className="space-y-1 text-sm">
              {stockOnly.map((p) => (
                <li key={p.group} className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{p.title}</span>
                  <span className="text-muted-foreground">{p.qty} unid.</span>
                  <Badge variant="secondary">{MYIO_STATUS_LABELS[p.status] ?? p.status}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
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

  const projectName = (id: string) => (id === ESTOQUE_PROJECT_ID ? "Estoque" : projects?.find((p) => p.id === id)?.name ?? "—");
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
          <OrdersTable orders={visible} projectName={projectName} showRequester={false} canEditRequester canDelete />
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

  const { data: approvalSteps } = useQuery({
    queryKey: ["approval-steps", "all-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_steps")
        .select("order_id, step_index, approver_id, role_label, status")
        .order("step_index", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = filterDelivered(orders ?? [], deliveredMode, deliveredFrom);
  const projectName = (id: string) => (id === ESTOQUE_PROJECT_ID ? "Estoque" : projects?.find((p) => p.id === id)?.name ?? "—");
  const requesterName = (id: string) => profiles?.get(id)?.full_name || profiles?.get(id)?.email || "—";
  const approvalMetaWithIndex = new Map<string, { stepIndex: number; status: string; finalApprover: string }>();
  (approvalSteps ?? []).forEach((step) => {
    const current = approvalMetaWithIndex.get(step.order_id);
    if (!current || step.step_index >= current.stepIndex) {
      approvalMetaWithIndex.set(step.order_id, {
        stepIndex: step.step_index,
        status: step.status,
        finalApprover: step.approver_id ? requesterName(step.approver_id) : step.role_label || "—",
      });
    }
  });
  const normalizedApprovalMeta = new Map(
    [...approvalMetaWithIndex.entries()].map(([id, { status, finalApprover }]) => [id, { status, finalApprover }]),
  );


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
          <OrdersTable orders={plist} projectName={projectName} requesterName={requesterName} showRequester canEdit canDelete approvalMeta={normalizedApprovalMeta} />
        </div>
      ));
    }
    return <OrdersTable orders={list} projectName={projectName} requesterName={requesterName} showRequester canEdit canDelete headerFilters approvalMeta={normalizedApprovalMeta} />;
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Todos os approvals</CardTitle>
          <CardDescription>Acompanhe o status de aprovação, o aprovador final e o andamento de cada solicitação.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DeliveredFilter mode={deliveredMode} setMode={setDeliveredMode} fromDate={deliveredFrom} setFromDate={setDeliveredFrom} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !filtered.length ? (
          <p className="text-sm text-muted-foreground">Nada por aqui.</p>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-start">
              <Button
                type="button"
                variant={groupByProject ? "default" : "outline"}
                size="sm"
                onClick={() => setGroupByProject((v) => !v)}
              >
                Agrupar por projeto
              </Button>
            </div>
            {renderOrders(filtered)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ApprovalsCenter() {
  const { data: me } = useCurrentUser();
  const { data: canViewAll = false, isLoading } = useQuery({
    queryKey: ["can-view-all-approvals", me?.jobTitle?.id, me?.isAdmin],
    enabled: Boolean(me),
    queryFn: async () => {
      if (me?.isAdmin) return true;
      if (!me?.jobTitle?.id) return false;
      const { data, error } = await supabase
        .from("job_title_hierarchy")
        .select("job_title_id")
        .eq("approver_job_title_id", me.jobTitle.id)
        .limit(1);
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
  });

  return (
    <Tabs defaultValue="mine">
      <TabsList className="mb-4">
        <TabsTrigger value="mine">Pendentes comigo</TabsTrigger>
        <TabsTrigger value="flow">Em fluxo de Aprovação</TabsTrigger>
        {!isLoading && canViewAll && <TabsTrigger value="all">Todos</TabsTrigger>}
      </TabsList>
      <TabsContent value="mine"><PendingForMe /></TabsContent>
      <TabsContent value="flow"><MyApprovalFlows /></TabsContent>
      {canViewAll && <TabsContent value="all"><BuyerQueue /></TabsContent>}
    </Tabs>
  );
}

/* ---------- Orders table ---------- */

function OrdersTable({
  orders, projectName, requesterName, showRequester, canEdit, canDelete, canEditRequester, stockParts, headerFilters, approvalMeta,
}: {
  orders: Order[];
  projectName: (id: string) => string;
  requesterName?: (id: string) => string;
  showRequester?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canEditRequester?: boolean;
  stockParts?: Map<string, StockPart>;
  headerFilters?: boolean;
  approvalMeta?: Map<string, { status: string; finalApprover: string }>;
}) {
  const { data: me } = useCurrentUser();
  const [fApproval, setFApproval] = useState("");
  const [fItem, setFItem] = useState("");
  const [fAloc, setFAloc] = useState("");
  const [fReq, setFReq] = useState("");
  const [fDate, setFDate] = useState("");
  const [fStatus, setFStatus] = useState<string>("all");

  const norm = (s: string) => s.toLowerCase().trim();
  const allocationOf = (o: Order) => (o.for_stock ? "Estoque" : o.project_id ? projectName(o.project_id) : "—");
  const visibleOrders = !headerFilters
    ? orders
    : orders.filter((o) =>
        (!fApproval || norm(o.approval_number ?? "").includes(norm(fApproval))) &&
        (!fItem || norm(`${requestTypeLabel(o)} ${o.item_name ?? ""} ${o.requester_notes ?? ""}`).includes(norm(fItem))) &&
        (!fAloc || norm(allocationOf(o)).includes(norm(fAloc))) &&
        (!fReq || norm(requesterName?.(o.requester_id) ?? "").includes(norm(fReq))) &&
        (!fDate || o.deadline_date === fDate || o.delivery_forecast === fDate) &&
        (fStatus === "all" || o.status === fStatus)
      );

  const filterInput = (value: string, onChange: (v: string) => void, placeholder: string) => (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-7 px-1 text-xs"
    />
  );

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="grid grid-cols-[minmax(0,96px)_minmax(0,1fr)] gap-2 border-t border-border/60 py-1.5 first:border-t-0">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="min-w-0 text-sm break-words">{children}</div>
    </div>
  );

  return (
    <>
      {/* Mobile: cartões com rótulo à esquerda e informação à direita */}
      <div className="space-y-3 md:hidden">
        {headerFilters && (
          <div className="grid grid-cols-1 gap-2 rounded-lg bg-primary/10 p-2 sm:grid-cols-2">
            {filterInput(fApproval, setFApproval, "Nº do Approval")}
            {filterInput(fItem, setFItem, "Tipo")}
            {filterInput(fAloc, setFAloc, "Alocação")}
            {showRequester && filterInput(fReq, setFReq, "Solicitante")}
            <Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} className="h-7 px-1 text-xs" />
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATUS_KEYS.map((k) => <SelectItem key={k} value={k}>{STATUS_LABELS[k]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {visibleOrders.map((o) => {
          const part = o.request_group_id ? stockParts?.get(o.request_group_id) : undefined;
          return (
            <div key={o.id} className="rounded-lg border border-border bg-card p-3">
              <Row label="Approval">
                <div className="flex items-center gap-1 font-mono font-bold">
                  <OrderReportDialog order={o} projectName={projectName} requesterName={requesterName} />
                  {canDelete && (me?.isAdmin || me?.id === o.requester_id) && <DeleteOrderDialog order={o} />}
                </div>
                <div className="mt-1 space-y-1">
                  <ExistingAttachments orderId={o.id} attachments={o.attachments ?? []} canRemove={canEdit} />
                  <div className="flex flex-wrap items-center gap-1">
                    {canEditRequester && o.status === "pendente" && <EditRequesterDialog order={o} />}
                    {canEditRequester && o.status === "entregue" && <ConfirmReceiptActions order={o} />}
                  </div>
                </div>
              </Row>
              <Row label="Tipo">
                <div className="font-medium">{requestTypeLabel(o)}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <FullTextPopover text={o.item_name ?? ""} />
                  {o.item_link ? (
                    <a href={o.item_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      ver link <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">sem link</span>
                  )}
                </div>
              </Row>
              <Row label="Alocação">{o.for_stock ? "Estoque" : o.project_id ? projectName(o.project_id) : "—"}</Row>
              {showRequester && <Row label="Solicitante">{requesterName?.(o.requester_id)}</Row>}
              <Row label="Qtd">
                {!part || part.qty <= 0 ? (
                  o.quantity
                ) : (
                  <div className="space-y-1">
                    <div className="font-medium">Total {o.quantity + part.qty}</div>
                    <div className="text-xs text-muted-foreground">{o.quantity} em compra</div>
                    <div className="text-xs text-emerald-700">
                      {part.qty} do estoque · {MYIO_STATUS_LABELS[part.status] ?? part.status}
                    </div>
                  </div>
                )}
              </Row>
              <Row label="Destinatário">{o.recipient || "—"}</Row>
              <Row label="Endereço de Entrega">{o.delivery_point}</Row>
              <Row label="Prazo e Previsão">
                <div>{DEADLINE_LABELS[o.deadline_type]}</div>
                {o.deadline_type === "customizado" && o.deadline_date && (
                  <div className="text-muted-foreground">{new Date(o.deadline_date + "T00:00:00").toLocaleDateString("pt-BR")}</div>
                )}
                <InlineField
                  order={o}
                  field="delivery_forecast"
                  type="date"
                  canEdit={canEdit}
                  display={
                    o.delivery_forecast
                      ? `Prev.: ${new Date(o.delivery_forecast + "T00:00:00").toLocaleDateString("pt-BR")}`
                      : "Prev.: —"
                  }
                />
              </Row>
              <Row label="Status"><StatusHistoryDialog order={o} canEdit={canEdit} /></Row>
              {approvalMeta && <Row label="Aprovação"><ApprovalStatusBadge status={o.approval_status ?? approvalMeta.get(o.id)?.status ?? "aprovado"} /></Row>}
              {approvalMeta && <Row label="Aprovador final">{approvalMeta.get(o.id)?.finalApprover ?? "—"}</Row>}
              <Row label="Palavra passe">
                <InlineField order={o} field="passphrase" type="text" canEdit={canEdit} display={o.passphrase || "—"} />
              </Row>
            </div>
          );
        })}
        {visibleOrders.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum registro.</div>
        )}
      </div>

      <div className="hidden md:block">

      <Table className="w-full table-fixed">
        <TableHeader className="[&_tr]:border-b">
          <TableRow className="border-t bg-primary/15 hover:bg-primary/15">
            <TableHead className="w-[110px] text-center font-bold">Approval</TableHead>
            <TableHead className="w-[210px] text-center font-bold">Tipo</TableHead>
            <TableHead className="w-[100px] text-center font-bold">Alocação</TableHead>
            {showRequester && <TableHead className="w-[120px] text-center font-bold">Solicitante</TableHead>}
            <TableHead className="w-[60px] text-center font-bold">Qtd</TableHead>
            <TableHead className="w-[100px] text-center font-bold">Destinatário</TableHead>
            <TableHead className="w-[120px] text-center font-bold">Endereço de Entrega</TableHead>
            <TableHead className="w-[100px] text-center font-bold">Prazo e Previsão</TableHead>
            <TableHead className="w-[100px] text-center font-bold">Status</TableHead>
            {approvalMeta && <TableHead className="w-[90px] text-center font-bold">Aprovação</TableHead>}
            {approvalMeta && <TableHead className="w-[110px] text-center font-bold">Aprovador final</TableHead>}
             <TableHead className="w-[90px] text-center font-bold">Palavra passe</TableHead>
          </TableRow>
          {headerFilters && (
            <TableRow className="bg-primary/5 hover:bg-primary/5">
              <TableHead className="py-1">{filterInput(fApproval, setFApproval, "Nº")}</TableHead>
              <TableHead className="py-1">{filterInput(fItem, setFItem, "Tipo")}</TableHead>
              <TableHead className="py-1">{filterInput(fAloc, setFAloc, "Alocação")}</TableHead>
              {showRequester && <TableHead className="py-1">{filterInput(fReq, setFReq, "Solicitante")}</TableHead>}
              <TableHead className="py-1" />
              <TableHead className="py-1" />
              <TableHead className="py-1" />
              <TableHead className="py-1">
                <Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} className="h-7 px-1 text-xs" />
              </TableHead>
              <TableHead className="py-1">
                <Select value={fStatus} onValueChange={setFStatus}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {STATUS_KEYS.map((k) => <SelectItem key={k} value={k}>{STATUS_LABELS[k]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </TableHead>
               <TableHead className="py-1" />
               {approvalMeta && <TableHead className="py-1" />}
               {approvalMeta && <TableHead className="py-1" />}
             </TableRow>
           )}
        </TableHeader>
        <TableBody>
          {visibleOrders.map((o) => (
            <TableRow key={o.id} className="align-top">
              <TableCell className="font-mono text-xs text-center">
                <div className="flex items-center justify-center gap-1">
                  <OrderReportDialog order={o} projectName={projectName} requesterName={requesterName} />
                  {canDelete && (me?.isAdmin || me?.id === o.requester_id) && <DeleteOrderDialog order={o} />}
                </div>
                <div className="mt-1 space-y-1 font-sans">
                  <ExistingAttachments orderId={o.id} attachments={o.attachments ?? []} canRemove={canEdit} />
                  <div className="flex flex-wrap items-center gap-1">
                    {canEditRequester && o.status === "pendente" && <EditRequesterDialog order={o} />}
                    {canEditRequester && o.status === "entregue" && <ConfirmReceiptActions order={o} />}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="line-clamp-4 font-medium break-words">{requestTypeLabel(o)}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <FullTextPopover text={o.item_name ?? ""} />
                  {o.item_link ? (
                    <a href={o.item_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      ver link <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">sem link</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm break-words text-center">{o.for_stock ? "Estoque" : o.project_id ? projectName(o.project_id) : "—"}</TableCell>
              {showRequester && <TableCell className="text-sm break-words text-center">{requesterName?.(o.requester_id)}</TableCell>}
              <TableCell className="text-center">
                {(() => {
                  const part = o.request_group_id ? stockParts?.get(o.request_group_id) : undefined;
                  if (!part || part.qty <= 0) return o.quantity;
                  return (
                    <div className="space-y-1">
                      <div className="font-medium">Total {o.quantity + part.qty}</div>
                      <div className="text-xs text-muted-foreground">{o.quantity} em compra</div>
                      <div className="text-xs text-emerald-700">
                        {part.qty} do estoque · {MYIO_STATUS_LABELS[part.status] ?? part.status}
                      </div>
                    </div>
                  );
                })()}
              </TableCell>
              <TableCell className="text-sm break-words text-center">{o.recipient || "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                <div className="line-clamp-4 break-words">{o.delivery_point}</div>
                <FullTextPopover text={o.delivery_point ?? ""} />
              </TableCell>
              <TableCell className="text-xs break-words text-center">
                <div>{DEADLINE_LABELS[o.deadline_type]}</div>
                {o.deadline_type === "customizado" && o.deadline_date && (
                  <div className="text-muted-foreground">{new Date(o.deadline_date + "T00:00:00").toLocaleDateString("pt-BR")}</div>
                )}
                <div className="mt-1 border-t pt-1">
                  <InlineField
                    order={o}
                    field="delivery_forecast"
                    type="date"
                    canEdit={canEdit}
                     display={
                       o.delivery_forecast
                         ? `Prev.: ${new Date(o.delivery_forecast + "T00:00:00").toLocaleDateString("pt-BR")}`
                         : "Prev.: —"
                     }
                     align="center"
                   />
                </div>
              </TableCell>
              <TableCell className="text-center"><StatusHistoryDialog order={o} canEdit={canEdit} /></TableCell>
              {approvalMeta && <TableCell className="text-center"><ApprovalStatusBadge status={o.approval_status ?? approvalMeta.get(o.id)?.status ?? "aprovado"} /></TableCell>}
              {approvalMeta && <TableCell className="text-center text-xs break-words">{approvalMeta.get(o.id)?.finalApprover ?? "—"}</TableCell>}
              <TableCell className="text-sm break-words text-center">
                <InlineField order={o} field="passphrase" type="text" canEdit={canEdit} display={o.passphrase || "—"} align="center" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </>

  );
}

function ApprovalStatusBadge({ status }: { status: string }) {
  if (status === "rejeitado") return <Badge variant="destructive">Rejeitado</Badge>;
  if (status === "aprovado") return <Badge className="bg-primary/20 text-foreground hover:bg-primary/20">Aprovado</Badge>;
  return <Badge variant="secondary">Pendente</Badge>;
}

function FullTextPopover({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (!text.trim()) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="text-xs text-primary hover:underline"
        >
          descrição completa
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="max-w-sm text-xs whitespace-pre-wrap break-words"
      >
        {text}
      </PopoverContent>
    </Popover>
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

const LOG_ACTION_LABELS: Record<string, string> = {
  criado: "Solicitação criada",
  status_alterado: "Status alterado",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  editado: "Alteração de dados",
  anexo_adicionado: "Anexo adicionado",
  anexo_removido: "Anexo removido",
};

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleString("pt-BR");
}

function OrderReportDialog({
  order, projectName, requesterName,
}: {
  order: Order;
  projectName: (id: string) => string;
  requesterName?: (id: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const { data: profiles } = useProfilesMap();
  const nameFor = (id: string | null | undefined) => {
    if (!id) return "—";
    const p = profiles?.get(id);
    return p?.full_name || p?.email || id;
  };

  const { data: logs, isLoading: loadingLogs } = useQuery({
    queryKey: ["order-report-logs", order.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_logs")
        .select("id, actor_id, action, details, created_at")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: steps } = useQuery({
    queryKey: ["order-report-steps", order.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_steps")
        .select("id, step_index, role_label, approver_id, status, comment, decided_at, decided_by")
        .eq("order_id", order.id)
        .order("step_index", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const relatedOrderIds = [order.parent_order_id, order.id].filter((id): id is string => Boolean(id));
  const { data: relatedOrders } = useQuery({
    queryKey: ["order-report-related", order.id, order.parent_order_id],
    enabled: open,
    queryFn: async () => {
      const originalId = order.parent_order_id ?? order.id;
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("id, parent_order_id, request_type, travel_type, item_name, created_at, payment_date, estimated_value")
        .or(`id.eq.${originalId},parent_order_id.eq.${originalId}`)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: relatedLogs } = useQuery({
    queryKey: ["order-report-related-logs", relatedOrderIds],
    enabled: open && relatedOrderIds.length > 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_logs")
        .select("id, order_id, actor_id, action, details, created_at")
        .in("order_id", relatedOrderIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
  const displayedLogs = relatedLogs ?? logs;

  const allocation = order.for_stock ? "Estoque" : order.project_id ? projectName(order.project_id) : "—";
  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="space-y-0.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm break-words">{value ?? "—"}</div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="font-bold text-black transition-colors hover:text-myio-green data-[state=open]:text-myio-green hover:underline" title="Ver relatório completo">
          {order.approval_number ?? "—"}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relatório da solicitação {order.approval_number ?? ""}</DialogTitle>
          <DialogDescription>Histórico completo: dados, aprovações, alterações e observações.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 font-sans">
          <section className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Row label="Item" value={order.item_name} />
            <Row label="Tipo(s)" value={(relatedOrders ?? [{ request_type: order.request_type, travel_type: order.travel_type }]).map(requestTypeLabel).filter((v, i, a) => a.indexOf(v) === i).join(" + ")} />
            <Row label="Quantidade" value={order.quantity} />
            <Row label="Alocação" value={allocation} />
            <Row label="Solicitante" value={requesterName ? requesterName(order.requester_id) : nameFor(order.requester_id)} />
            <Row label="Destinatário" value={order.recipient} />
            <Row label="Endereço de entrega" value={order.delivery_point} />
            <Row label="Prazo" value={`${DEADLINE_LABELS[order.deadline_type]}${order.deadline_date ? ` — ${new Date(order.deadline_date + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}`} />
            <Row label="Previsão de entrega" value={order.delivery_forecast ? new Date(order.delivery_forecast + "T00:00:00").toLocaleDateString("pt-BR") : "—"} />
            <Row label="Status" value={STATUS_LABELS[order.status]} />
            <Row label="Palavra passe" value={order.passphrase || "—"} />
            <Row label="Criado em" value={fmtDateTime(order.created_at)} />
            {order.payment_date && <Row label="Data do pagamento" value={new Date(order.payment_date + "T00:00:00").toLocaleDateString("pt-BR")} />}
            {relatedOrders && relatedOrders.length > 1 && relatedOrders.map((related) => (
              <Row key={related.id} label={`Criação — ${requestTypeLabel(related)}`} value={fmtDateTime(related.created_at)} />
            ))}
            <Row label="Última atualização" value={fmtDateTime(order.updated_at)} />
            {order.item_link && (
              <Row label="Link do item" value={<a href={order.item_link} target="_blank" rel="noreferrer" className="text-primary hover:underline">Abrir link</a>} />
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Observações</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Row label="Do solicitante" value={order.requester_notes || "—"} />
              <Row label="Do time de supply" value={order.buyer_notes || "—"} />
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Anexos</h3>
            {(order.attachments ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum anexo.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {(order.attachments ?? []).map((a) => (
                  <li key={a.path}>
                    <button type="button" className="text-primary hover:underline" onClick={() => openAttachment(a.path)}>{a.name}</button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Aprovações</h3>
            {!steps || steps.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem etapas de aprovação registradas.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Aprovador</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Decidido em</TableHead>
                    <TableHead>Comentário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {steps.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.step_index + 1}. {s.role_label}</TableCell>
                      <TableCell>{nameFor(s.decided_by ?? s.approver_id)}</TableCell>
                      <TableCell>{s.status}</TableCell>
                      <TableCell>{fmtDateTime(s.decided_at)}</TableCell>
                      <TableCell className="whitespace-pre-wrap">{s.comment || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Histórico completo</h3>
            {loadingLogs ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : !displayedLogs || displayedLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum registro.</p>
            ) : (
              <ol className="space-y-3 border-l pl-4">
                {displayedLogs.map((l) => (
                  <li key={l.id} className="space-y-1">
                    <div className="text-sm font-medium">{LOG_ACTION_LABELS[l.action] ?? l.action}</div>
                    <div className="text-xs text-muted-foreground">{fmtDateTime(l.created_at)} — {nameFor(l.actor_id)}</div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function InlineField({
  order, field, type, canEdit, display, align = "left",
}: {
  order: Order;
  field: "delivery_forecast" | "passphrase" | "buyer_notes";
  type: "date" | "text" | "textarea";
  canEdit?: boolean;
  display: string;
  align?: "left" | "center";
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string>((order[field] as string | null) ?? "");

  const save = useMutation({
    mutationFn: async (next: string) => {
      const v = next || null;
      const patch =
        field === "delivery_forecast" ? { delivery_forecast: v }
        : field === "passphrase" ? { passphrase: v }
        : { buyer_notes: v };
      const { error } = await supabase
        .from("purchase_orders")
        .update(patch)
        .eq("id", order.id);
      if (error) throw error;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["logs"] });
      setEditing(false);
      toast.success("Atualizado");
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setValue((order[field] as string | null) ?? "");
      setEditing(false);
    },
  });

  const commit = () => {
    const current = (order[field] as string | null) ?? "";
    if (value === current) { setEditing(false); return; }
    save.mutate(value);
  };

  const alignClass = align === "center" ? "text-center" : "text-left";
  if (!canEdit) return <span className={`whitespace-pre-wrap ${alignClass}`}>{display}</span>;

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => { setValue((order[field] as string | null) ?? ""); setEditing(true); }}
        className={`w-full rounded px-1 py-0.5 ${alignClass} whitespace-pre-wrap hover:bg-muted`}
        title="Clique para editar"
      >
        {display}
      </button>
    );
  }

  if (type === "textarea") {
    return (
      <Textarea
        autoFocus
        rows={3}
        value={value}
        disabled={save.isPending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); }}
      />
    );
  }

  return (
    <Input
      autoFocus
      type={type}
      value={value}
      disabled={save.isPending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
    />
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
      return toast.error("Selecione um item cadastrado: Insumos de Fabricação, Insumos de Instalação, Material de Almoxarifado ou Máquinas e Ferramentas.");
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
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" title="Editar pedido" aria-label="Editar pedido">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
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
                {(projects ?? []).filter((p) => !p.status || p.status === "active").map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
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
              <Input id={`e-qty-${order.id}`} name="quantity" type="number" min={1} max={99999} className="w-20" defaultValue={order.quantity} required />
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
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button type="button" aria-label="Excluir pedido" title="Excluir pedido" className="text-destructive hover:text-destructive/80">
          <Trash2 className="h-4 w-4" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir pedido</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação apaga <strong>{order.item_name}</strong> e todo o seu histórico. Deseja continuar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={del.isPending}
            onClick={() => del.mutate()}
          >
            {del.isPending ? "Excluindo..." : "Excluir definitivamente"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function formatBRL(v: number | null | undefined) {
  return (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ProjectsAdmin({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: projects, isLoading } = useProjects();
  const { data: clients } = useClients();
  const { data: me } = useCurrentUser();
  const canCreate = !!me?.canCreateProjects;
  const [clientId, setClientId] = useState<string>("none");
  const [budgetVal, setBudgetVal] = useState("0");
  const [statusDialog, setStatusDialog] = useState<{ id: string; name: string; action: "implantado" | "cancelado" } | null>(null);
  const [statusDate, setStatusDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const create = useMutation({
    mutationFn: async (v: { name: string; description: string; client_id: string | null; budget: number }) => {
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

  const setStatus = useMutation({
    mutationFn: async ({ id, status, concludedAt }: { id: string; status: "active" | "implantado" | "cancelado"; concludedAt: string | null }) => {
      const { error } = await supabase.from("projects").update({ status, concluded_at: concludedAt }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status do projeto atualizado"); qc.invalidateQueries({ queryKey: ["projects"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const description = String(fd.get("description") || "").trim();
    const budget = Number(budgetVal || "0");
    if (name.length < 2) return toast.error("Nome muito curto");
    if (!Number.isFinite(budget) || budget <= 0) return toast.error("Informe o orçamento aprovado do projeto.");
    create.mutate(
      { name, description, client_id: clientId === "none" ? null : clientId, budget },
      { onSuccess: () => { (e.target as HTMLFormElement).reset(); setClientId("none"); } },
    );
  }

  const clientOf = (p: { client_id?: string | null }) => clients?.find((c) => c.id === p.client_id);

  return (
    <div className="grid gap-6 [&>*]:min-w-0 lg:grid-cols-[1fr_1.5fr]">
      <Card>
        <CardHeader>
          <CardTitle>Novo projeto</CardTitle>
        </CardHeader>
        <CardContent>
          {!canCreate ? (
            <p className="text-sm text-muted-foreground">
              Você não tem permissão para cadastrar projetos. Solicite ao CEO, COO ou CFO.
            </p>
          ) : (
          <form onSubmit={onCreate} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="p-name">Nome do projeto</Label><Input id="p-name" name="name" required /></div>
            <div className="space-y-2">
              <Label htmlFor="p-budget">Orçamento aprovado (R$)</Label>
              <MoneyInput id="p-budget" className="w-32" value={budgetVal} onChange={setBudgetVal} required placeholder="0,00" />
            </div>
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
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Projetos</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
            !projects?.length ? <p className="text-sm text-muted-foreground">Sem projetos.</p> :
            <Table>
              <TableHeader><TableRow><TableHead>Nome do projeto</TableHead><TableHead>Orçamento</TableHead><TableHead>Cliente</TableHead><TableHead>Descrição</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-center">Data</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {projects.map((p) => {
                  const st = (p as { status?: string }).status ?? "active";
                  const ca = (p as { concluded_at?: string | null }).concluded_at;
                  return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-sm">{formatBRL((p as { budget?: number }).budget)}</TableCell>
                    <TableCell className="text-sm">{clientOf(p)?.name || p.client_name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.description || "—"}</TableCell>
                    <TableCell className="text-center">
                      {st === "active" ? (
                        <span className="inline-block rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Ativo</span>
                      ) : st === "implantado" ? (
                        <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">Implantado</span>
                      ) : (
                        <span className="inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">Cancelado</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {ca ? new Date(ca).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {st === "active" && (
                          <>
                            <button type="button" aria-label="Marcar como implantado" title="Marcar como implantado" className="text-blue-600 hover:text-blue-800" onClick={() => { setStatusDialog({ id: p.id, name: p.name, action: "implantado" }); setStatusDate(new Date().toISOString().slice(0, 10)); }}>
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button type="button" aria-label="Cancelar projeto" title="Cancelar projeto" className="text-destructive hover:text-destructive/80" onClick={() => { setStatusDialog({ id: p.id, name: p.name, action: "cancelado" }); setStatusDate(new Date().toISOString().slice(0, 10)); }}>
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {st !== "active" && (
                          <button type="button" aria-label="Reativar projeto" title="Reativar projeto" className="text-muted-foreground hover:text-foreground" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: p.id, status: "active", concludedAt: null })}>
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                        <button type="button" aria-label="Excluir projeto" title="Excluir projeto" className="text-destructive hover:text-destructive/80" disabled={remove.isPending} onClick={() => remove.mutate(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          }
        </CardContent>
      </Card>
      <AlertDialog open={!!statusDialog} onOpenChange={(o) => { if (!o) setStatusDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusDialog?.action === "implantado" ? "Implantar projeto" : "Cancelar projeto"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusDialog?.action === "implantado"
                ? `Confirmar a implantação do projeto "${statusDialog?.name}"? Após a implantação, o projeto não poderá receber novas solicitações.`
                : `Confirmar o cancelamento do projeto "${statusDialog?.name}"? O projeto será marcado como fracassado e não poderá receber novas solicitações.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="status-date">
              {statusDialog?.action === "implantado" ? "Data de implantação" : "Data de cancelamento"}
            </Label>
            <Input id="status-date" type="date" value={statusDate} onChange={(e) => setStatusDate(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={setStatus.isPending || !statusDate}
              onClick={() => {
                if (statusDialog) {
                  setStatus.mutate(
                    { id: statusDialog.id, status: statusDialog.action, concludedAt: statusDate },
                    { onSuccess: () => setStatusDialog(null) },
                  );
                }
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------- Users admin ---------- */

function ApprovalLimitInput({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [draft, setDraft] = useState(String(value ?? 0));
  useEffect(() => { setDraft(String(value ?? 0)); }, [value]);
  return (
    <MoneyInput
      className="h-8 w-full min-w-0 px-1 text-right text-xs md:text-xs"
      value={draft}
      onChange={setDraft}
      onBlur={() => {
        const n = Number(draft);
        if (!Number.isFinite(n) || n < 0) { setDraft(String(value ?? 0)); return; }
        if (n !== Number(value ?? 0)) onSave(n);
      }}
    />
  );
}

function UsersAdmin() {
  const qc = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const setAccessProfileFn = useServerFn(setUserAccessProfile);
  const requestDeletionFn = useServerFn(requestUserDeletion);
  const decideDeletionFn = useServerFn(decideUserDeletion);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles, error: pe }, { data: accessProfiles, error: ae }, { data: menuPermissions, error: me }, { data: titles, error: te }] = await Promise.all([
        supabase.from("profiles").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("user_access_profiles").select("user_id, profile"),
        supabase.from("user_menu_permissions").select("user_id, allowed").eq("allowed", true),
        supabase.from("job_titles").select("id,name").eq("active", true).order("name"),
      ]);
      if (pe) throw pe;
      if (ae) throw ae;
      if (me) throw me;
      if (te) throw te;
      const titleById = new Map((titles ?? []).map((title) => [title.id, title.name]));
      const accessByUser = new Map((accessProfiles ?? []).map((item) => [item.user_id, item.profile]));
      const configuredUsers = new Set((menuPermissions ?? []).map((item) => item.user_id));
      return (profiles ?? []).map((p) => ({
        ...p,
        jobTitleId: p.job_title_id,
        jobTitleName: p.job_title_id ? titleById.get(p.job_title_id) ?? null : null,
        accessProfile: accessByUser.get(p.id) ?? "restrito",
        hasConfiguredAccess: configuredUsers.has(p.id),
      }));
    },
  });

  const setJobTitle = useMutation({
    mutationFn: async ({ userId, jobTitleId }: { userId: string; jobTitleId: string | null }) => {
      const { error } = await supabase.from("profiles").update({ job_title_id: jobTitleId }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cargo atualizado"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const setAccessProfile = useMutation({
    mutationFn: async ({ userId, profile }: { userId: string; profile: "admin" | "padrao" | "restrito" }) => {
      await setAccessProfileFn({ data: { userId, profile } });
    },
    onSuccess: () => {
      toast.success("Perfil de acesso atualizado");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["restricted-access-profiles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: deletionRequests } = useQuery({
    queryKey: ["user-deletion-requests"],
    queryFn: async () => {
      const { data: requests, error } = await supabase
        .from("user_deletion_requests")
        .select("id, target_user_id, requested_by, decided_by, status, requested_at, decided_at")
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return requests ?? [];
    },
  });

  const requestDeletion = useMutation({
    mutationFn: async (userId: string) => requestDeletionFn({ data: { userId } }),
    onSuccess: () => {
      toast.success("Exclusão enviada para aprovação de outro Admin");
      qc.invalidateQueries({ queryKey: ["user-deletion-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const decideDeletion = useMutation({
    mutationFn: async ({ requestId, approve }: { requestId: string; approve: boolean }) => decideDeletionFn({ data: { requestId, approve } }),
    onSuccess: (_, variables) => {
      toast.success(variables.approve ? "Exclusão aprovada" : "Exclusão rejeitada");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["user-deletion-requests"] });
      qc.invalidateQueries({ queryKey: ["profiles-list"] });
      qc.invalidateQueries({ queryKey: ["profiles-map"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setProfileField = useMutation({
    mutationFn: async ({ userId, patch }: { userId: string; patch: Partial<{ approval_limit: number; manager_id: string | null; tier2_limit: number; tier3_limit: number }> }) => {
      const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Usuário atualizado"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: jobTitles } = useJobTitles();

  const { data: roleHierarchy } = useQuery({
    queryKey: ["role-hierarchy"],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_title_hierarchy").select("job_title_id, approver_job_title_id");
      if (error) throw error;
      const map = new Map<string, string | null>();
      (data ?? []).forEach((r) => map.set(r.job_title_id, r.approver_job_title_id));
      return map;
    },
  });

  const approverLabelOf = (jobTitleId: string | null) => {
    const next = jobTitleId ? roleHierarchy?.get(jobTitleId) ?? null : null;
    return next ? jobTitles?.find((title) => title.id === next)?.name ?? "" : "";
  };

  const [fName, setFName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fManager, setFManager] = useState("");
  const [fRole, setFRole] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "profile">("name");

  const norm = (s: string) => s.toLowerCase().trim();
  const isPendingRestrictedUser = (user: NonNullable<typeof data>[number]) =>
    user.accessProfile === "restrito" && (!user.hasConfiguredAccess || !approverLabelOf(user.jobTitleId));
  const pendingUsers = (data ?? []).filter(isPendingRestrictedUser);
  const activeUsers = (data ?? []).filter((user) => !isPendingRestrictedUser(user));
  const rows = activeUsers.filter((u) => {
    return (
      (!fName || norm(u.full_name ?? "").includes(norm(fName))) &&
      (!fEmail || norm(u.email ?? "").includes(norm(fEmail))) &&
      (!fManager || norm(approverLabelOf(u.jobTitleId)).includes(norm(fManager))) &&
      (fRole === "all" || u.jobTitleId === fRole)
    );
  }).sort((a, b) => {
    if (sortBy === "profile") {
      const byProfile = String(a.accessProfile).localeCompare(String(b.accessProfile), "pt-BR");
      if (byProfile !== 0) return byProfile;
    }
    return String(a.full_name ?? "").localeCompare(String(b.full_name ?? ""), "pt-BR");
  });


  const filterInput = (value: string, onChange: (v: string) => void, placeholder: string) => (
    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-7 px-1 text-xs" />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuários cadastrados</CardTitle>
        <CardDescription>Defina separadamente o cargo da cadeia de aprovação e o perfil de acesso às funcionalidades.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
        <>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-primary/10 p-2 sm:grid-cols-5">
            {filterInput(fName, setFName, "Nome")}
            {filterInput(fEmail, setFEmail, "E-mail")}
            {filterInput(fManager, setFManager, "Cargo aprovador")}

            <Select value={fRole} onValueChange={setFRole}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Perfil" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(jobTitles ?? []).map((title) => <SelectItem key={title.id} value={title.id}>{title.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as "name" | "profile")}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Ordenar por nome</SelectItem>
                <SelectItem value="profile">Ordenar por perfil</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {pendingUsers.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-bold">Usuários pendentes</h4>
              {pendingUsers.map((user) => (
                <div key={user.id} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(180px,260px)_auto] sm:items-end">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{user.full_name || user.email || "Usuário"}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email || "E-mail não informado"}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-medium text-muted-foreground">Cargo</span>
                    <Select
                      value={user.jobTitleId ?? "none"}
                      onValueChange={(value) => setJobTitle.mutate({ userId: user.id, jobTitleId: value === "none" ? null : value })}
                    >
                      <SelectTrigger className="h-8 w-full text-xs"><SelectValue placeholder="Sem cargo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem cargo</SelectItem>
                        {(jobTitles ?? []).map((title) => <SelectItem key={title.id} value={title.id}>{title.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-1 sm:justify-end">
                    {!user.hasConfiguredAccess ? <Badge variant="outline">Aguardando liberação de menus</Badge> : null}
                    {!approverLabelOf(user.jobTitleId) ? <Badge variant="outline">Aguardando definição do aprovador</Badge> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {(deletionRequests ?? []).some((request) => request.status === "pendente") ? (
            <div className="space-y-2">
              <h4 className="text-sm font-bold">Exclusões pendentes</h4>
              {(deletionRequests ?? []).filter((request) => request.status === "pendente").map((request) => {
                const target = data?.find((user) => user.id === request.target_user_id);
                const requester = data?.find((user) => user.id === request.requested_by);
                const canDecide = request.requested_by !== currentUser?.id;
                return (
                  <div key={request.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">{target?.full_name || target?.email || "Usuário"}</p>
                      <p className="text-xs text-muted-foreground">Solicitado por {requester?.full_name || requester?.email || "Admin"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={!canDecide || decideDeletion.isPending} onClick={() => decideDeletion.mutate({ requestId: request.id, approve: false })}>Rejeitar</Button>
                      <Button size="sm" disabled={!canDecide || decideDeletion.isPending} onClick={() => decideDeletion.mutate({ requestId: request.id, approve: true })}>Aprovar exclusão</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
          {(() => {
            const groupOrder = sortBy === "profile" ? ["admin", "padrao", "restrito"] : ["all"];
            const groupLabel: Record<string, string> = { admin: "Perfil Admin", padrao: "Perfil Padrão", restrito: "Perfil Restrito", all: "Usuários" };
            const groups = groupOrder
              .map((g) => ({
                key: g,
                label: groupLabel[g] ?? g,
                users: rows.filter((u) => {
                  return g === "all" || u.accessProfile === g;
                }),
              }))
              .filter((g) => g.users.length > 0);
            if (groups.length === 0) return <p className="text-sm text-muted-foreground">Nenhum usuário.</p>;
            return groups.map((g) => (
              <div key={g.key} className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between bg-primary/10 px-3 py-2">
                  <h4 className="text-sm font-bold">{g.label}</h4>
                  <span className="text-xs text-muted-foreground">{g.users.length}</span>
                </div>
                <div className="divide-y divide-border">
                  {g.users.map((u) => {
                    const p = u as unknown as { approval_limit?: number; tier2_limit?: number; tier3_limit?: number; manager_id?: string | null };
                    const primary = u.jobTitleId ?? "none";
                    return (
                      <div key={u.id} className="p-3">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{u.full_name || "—"}</div>
                            <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                          </div>
                          <div className="flex flex-wrap justify-end gap-1">
                            <Badge variant="outline">Perfil: {u.accessProfile === "admin" ? "Admin" : u.accessProfile === "restrito" ? "Restrito" : "Padrão"}</Badge>
                            <Badge variant="outline">Cargo: {u.jobTitleName ?? "Sem cargo"}</Badge>
                            {u.id !== currentUser?.id ? (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Solicitar exclusão" aria-label={`Solicitar exclusão de ${u.full_name || u.email}`}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Solicitar exclusão do usuário?</AlertDialogTitle>
                                    <AlertDialogDescription>A exclusão de {u.full_name || u.email} ficará pendente até outro Admin aprovar.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction disabled={requestDeletion.isPending} onClick={() => requestDeletion.mutate(u.id)}>Solicitar exclusão</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 lg:grid-cols-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-medium text-muted-foreground">Aprovado por (cargo)</span>
                            <div className="flex h-8 items-center rounded-md border border-input bg-muted/40 px-2 text-xs text-muted-foreground">
                              {approverLabelOf(u.jobTitleId) || "—"}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-medium text-muted-foreground">Cargo</span>
                            <Select
                              value={primary}
                              onValueChange={(v) => setJobTitle.mutate({ userId: u.id, jobTitleId: v === "none" ? null : v })}
                            >
                              <SelectTrigger className="h-8 w-full text-xs"><SelectValue placeholder="Sem cargo" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sem cargo</SelectItem>
                                {(jobTitles ?? []).map((title) => <SelectItem key={title.id} value={title.id}>{title.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-medium text-muted-foreground">Perfil de acesso</span>
                            <Select value={u.accessProfile} onValueChange={(value) => setAccessProfile.mutate({ userId: u.id, profile: value as "admin" | "padrao" | "restrito" })}>
                              <SelectTrigger className="h-8 w-full text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="padrao">Padrão</SelectItem>
                                <SelectItem value="restrito">Restrito</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-medium text-muted-foreground">Faixa 1 - Aprovação automática</span>
                            <ApprovalLimitInput
                              value={Number(p.approval_limit ?? 0)}
                              onSave={(limit) => setProfileField.mutate({ userId: u.id, patch: { approval_limit: limit } })}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-medium text-muted-foreground">Faixa 2</span>
                            <ApprovalLimitInput
                              value={Number(p.tier2_limit ?? 50000)}
                              onSave={(limit) => setProfileField.mutate({ userId: u.id, patch: { tier2_limit: limit } })}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-medium text-muted-foreground">Faixa 3</span>
                            <ApprovalLimitInput
                              value={Number(p.tier3_limit ?? 250000)}
                              onSave={(limit) => setProfileField.mutate({ userId: u.id, patch: { tier3_limit: limit } })}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </>
        }
      </CardContent>
    </Card>
  );
}

/* ---------- Logs ---------- */

function StatusHistoryDialog({ order, canEdit }: { order: Order; canEdit?: boolean }) {
  const approvalStatus = (order as unknown as { approval_status?: string }).approval_status ?? "aprovado";
  const awaitingApproval = approvalStatus === "aguardando_aprovacao";
  const rejected = approvalStatus === "rejeitado";
  if (awaitingApproval || rejected) canEdit = false;
  const qc = useQueryClient();
  const updateStatus = useMutation({
    mutationFn: async (next: Order["status"]) => {
      const { error } = await supabase.from("purchase_orders").update({ status: next }).eq("id", order.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["logs"] });
      qc.invalidateQueries({ queryKey: ["order-logs", order.id] });
      toast.success("Status atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
          {awaitingApproval ? (
            <Badge className={STATUS_BADGE_BASE}>Aguardando aprovação</Badge>
          ) : rejected ? (
            <Badge className={STATUS_BADGE_BASE}>Rejeitado</Badge>
          ) : (
            <Badge className={STATUS_CLASSES[order.status]}>{STATUS_LABELS[order.status]}</Badge>
          )}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{canEdit ? "Status do pedido" : "Histórico de status"}</DialogTitle>
          <DialogDescription>{order.item_name}</DialogDescription>
        </DialogHeader>
        {canEdit && (
          <div className="space-y-2">
            <Label>Alterar status</Label>
            <Select
              value={order.status}
              onValueChange={(v) => updateStatus.mutate(v as Order["status"])}
              disabled={updateStatus.isPending}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(BUYER_STATUS_KEYS.includes(order.status) ? BUYER_STATUS_KEYS : [...BUYER_STATUS_KEYS, order.status]).map((v) => (
                  <SelectItem key={v} value={v}>{STATUS_LABELS[v]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

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

  const [fAction, setFAction] = useState("all");
  const [fActor, setFActor] = useState("all");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  const actions = Array.from(new Set((logs ?? []).map((l) => l.action))).sort();
  const actors = Array.from(new Set((logs ?? []).map((l) => l.actor_id).filter(Boolean) as string[]))
    .map((id) => ({ id, name: profiles?.get(id)?.full_name || profiles?.get(id)?.email || id }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const filtered = (logs ?? []).filter((l) => {
    if (fAction !== "all" && l.action !== fAction) return false;
    if (fActor !== "all" && l.actor_id !== fActor) return false;
    const when = new Date(l.created_at);
    if (fFrom && when < new Date(fFrom + "T00:00:00")) return false;
    if (fTo && when > new Date(fTo + "T23:59:59")) return false;
    return true;
  });

  const hasFilters = fAction !== "all" || fActor !== "all" || fFrom || fTo;

  return (
    <Card>
      <CardHeader><CardTitle>Logs de pedidos</CardTitle><CardDescription>Últimas 200 ações.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Ação</Label>
            <Select value={fAction} onValueChange={setFAction}>
              <SelectTrigger className="h-9 w-48"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Quem</Label>
            <Select value={fActor} onValueChange={setFActor}>
              <SelectTrigger className="h-9 w-56"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {actors.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">De</Label>
            <Input type="date" className="h-9 w-40" value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Até</Label>
            <Input type="date" className="h-9 w-40" value={fTo} onChange={(e) => setFTo(e.target.value)} />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setFAction("all"); setFActor("all"); setFFrom(""); setFTo(""); }}>
              Limpar filtros
            </Button>
          )}
        </div>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
          !logs?.length ? <p className="text-sm text-muted-foreground">Nada registrado ainda.</p> :
          !filtered.length ? <p className="text-sm text-muted-foreground">Nenhum registro para os filtros selecionados.</p> :
          <Table>
            <TableHeader><TableRow><TableHead>Quando</TableHead><TableHead>Ação</TableHead><TableHead>Pedido</TableHead><TableHead>Quem</TableHead><TableHead>Detalhes</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((l) => {
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