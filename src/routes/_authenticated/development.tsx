import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CodeXml, Download, Eye, History, Paperclip, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MyioAppLogo } from "@/components/myio-app-logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { APP_NAVIGATION_OPTIONS } from "@/lib/app-navigation-options";
import { ThemeToggle } from "@/components/theme-toggle";

type TicketStatus = "aberto" | "em_atendimento" | "atendido" | "concluido" | "excluido";
type Ticket = {
  id: string;
  ticket_number: number;
  app_key: string;
  ticket_type: "melhoria" | "bug";
  title: string;
  description: string;
  priority: "baixa" | "media" | "alta" | "critica";
  urgency: "normal" | "urgente";
  expected_result: string;
  status: TicketStatus;
  reporter_id: string;
  menu_name: string | null;
  submenu_name: string | null;
  assignee_id: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

const APP_NAMES: Record<string, string> = {
  supply: "Supply",
  cash_flow: "Cash Flow",
  crm: "CRM",
  legal: "Legal",
  rh: "RH",
  development: "Code",
};
const STATUS_NAMES: Record<TicketStatus, string> = {
  aberto: "Em aberto",
  em_atendimento: "Em atendimento",
  atendido: "Atendido",
  concluido: "Concluído",
  excluido: "Excluído",
};
const ADMIN_STATUS_NAMES: Record<Exclude<TicketStatus, "concluido" | "excluido">, string> = {
  aberto: "Em aberto",
  em_atendimento: "Em atendimento",
  atendido: "Atendido",
};
const PRIORITY_NAMES = { baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica" } as const;

export const Route = createFileRoute("/_authenticated/development")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_app_access").select("app_key").eq("user_id", context.user.id).eq("app_key", "development").maybeSingle();
    if (!data) throw redirect({ to: "/portal" });
  },
  component: DevelopmentPage,
  head: () => ({
    meta: [
      { title: "Tickets | myio Code" },
      { name: "description", content: "Abertura e acompanhamento de melhorias e bugs dos aplicativos myio." },
      { property: "og:title", content: "Tickets | myio Code" },
      { property: "og:description", content: "Abertura e acompanhamento de melhorias e bugs dos aplicativos myio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function DevelopmentPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [search, setSearch] = useState("");
  const [appFilter, setAppFilter] = useState("todos");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [priorityFilter, setPriorityFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");

  const { data, isLoading } = useQuery({
    queryKey: ["development-tickets"],
    queryFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw authError ?? new Error("Sessão não encontrada");
      const userId = authData.user.id;
      const [{ data: tickets, error: ticketsError }, { data: admin }, { data: profiles }, { data: erpAdmins }, { data: codeAccesses }] = await Promise.all([
        supabase.from("development_tickets").select("*").order("created_at", { ascending: false }),
        supabase.from("erp_admins").select("user_id").eq("user_id", userId).maybeSingle(),
        supabase.from("profiles").select("id, full_name, email").is("deleted_at", null).order("full_name"),
        supabase.from("erp_admins").select("user_id"),
        supabase.from("user_app_access").select("user_id").eq("app_key", "development"),
      ]);
      if (ticketsError) throw ticketsError;
      const codeAccessIds = new Set((codeAccesses ?? []).map((access) => access.user_id));
      const eligibleAdminIds = new Set((erpAdmins ?? []).map((entry) => entry.user_id).filter((id) => codeAccessIds.has(id)));
      const codeAdmins = (profiles ?? []).filter((profile) => eligibleAdminIds.has(profile.id));
      return { tickets: (tickets ?? []) as Ticket[], isAdmin: Boolean(admin) && codeAccessIds.has(userId), profiles: profiles ?? [], codeAdmins, userId };
    },
  });

  const filteredTickets = useMemo(() => (data?.tickets ?? []).filter((ticket) => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return (!term || ticket.title.toLocaleLowerCase("pt-BR").includes(term) || String(ticket.ticket_number).includes(term))
      && (appFilter === "todos" || ticket.app_key === appFilter)
      && (typeFilter === "todos" || ticket.ticket_type === typeFilter)
      && (priorityFilter === "todos" || ticket.priority === priorityFilter)
      && (statusFilter === "todos" || ticket.status === statusFilter);
  }), [appFilter, data?.tickets, priorityFilter, search, statusFilter, typeFilter]);
  const profileNames = useMemo(() => new Map((data?.profiles ?? []).map((profile) => [profile.id, profile.full_name || profile.email || "Usuário"])), [data?.profiles]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link to="/portal"><MyioAppLogo appName="Code" className="text-base sm:text-2xl" /></Link>
          <div className="flex items-center gap-1"><Button asChild variant="outline" size="sm"><Link to="/portal"><ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Plataforma ERP</span></Link></Button><ThemeToggle /></div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-extrabold"><CodeXml className="h-8 w-8" />Tickets</h1>
            <p className="mt-1 text-muted-foreground">Melhorias e bugs de todos os aplicativos.</p>
          </div>
          <NewTicketDialog open={createOpen} onOpenChange={setCreateOpen} userId={data?.userId} onCreated={() => queryClient.invalidateQueries({ queryKey: ["development-tickets"] })} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acompanhamento</CardTitle>
            <CardDescription>{data?.isAdmin ? "Todos os tickets abertos na plataforma." : "Tickets abertos por você ou atribuídos a você."}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Carregando tickets...</p> : (
              <Table>
                 <TableHeader>
                   <TableRow className="bg-primary/20 hover:bg-primary/20"><TableHead>Nº</TableHead><TableHead>Solicitante</TableHead><TableHead>Aplicativo</TableHead><TableHead>Tipo</TableHead><TableHead>Título</TableHead><TableHead>Prioridade</TableHead><TableHead>Situação</TableHead><TableHead>Data</TableHead></TableRow>
                   <TableRow className="bg-primary/5 hover:bg-primary/5">
                     <TableHead className="py-1" />
                     <TableHead className="py-1" />
                     <TableHead className="py-1"><HeaderFilterSelect value={appFilter} onChange={setAppFilter} label="Filtrar por aplicativo" options={Object.entries(APP_NAMES).map(([value, label]) => ({ value, label }))} /></TableHead>
                     <TableHead className="py-1"><HeaderFilterSelect value={typeFilter} onChange={setTypeFilter} label="Filtrar por tipo" options={[{ value: "melhoria", label: "Melhoria" }, { value: "bug", label: "Bug" }]} /></TableHead>
                     <TableHead className="py-1"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filtrar" aria-label="Filtrar por número ou título" className="h-8 min-w-28 bg-background" /></TableHead>
                     <TableHead className="py-1"><HeaderFilterSelect value={priorityFilter} onChange={setPriorityFilter} label="Filtrar por prioridade" options={Object.entries(PRIORITY_NAMES).map(([value, label]) => ({ value, label }))} /></TableHead>
                     <TableHead className="py-1"><HeaderFilterSelect value={statusFilter} onChange={setStatusFilter} label="Filtrar por situação" options={Object.entries(STATUS_NAMES).map(([value, label]) => ({ value, label }))} /></TableHead>
                     <TableHead className="py-1" />
                   </TableRow>
                 </TableHeader>
                <TableBody>{filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                    <TableCell className="font-semibold">#{ticket.ticket_number}</TableCell>
                     <TableCell>{profileNames.get(ticket.reporter_id) ?? "Usuário"}</TableCell>
                    <TableCell>{APP_NAMES[ticket.app_key] ?? ticket.app_key}</TableCell>
                    <TableCell><Badge variant="outline">{ticket.ticket_type === "bug" ? "Bug" : "Melhoria"}</Badge></TableCell>
                    <TableCell className="max-w-xs truncate font-medium">{ticket.title}</TableCell>
                    <TableCell>{PRIORITY_NAMES[ticket.priority]}</TableCell>
                    <TableCell><Badge variant="status">{STATUS_NAMES[ticket.status]}</Badge></TableCell>
                    <TableCell>{new Date(ticket.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  </TableRow>
                 ))}{!filteredTickets.length ? <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Nenhum ticket encontrado.</TableCell></TableRow> : null}</TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
      <TicketDetails ticket={selectedTicket} onClose={() => setSelectedTicket(null)} data={data} onUpdated={() => {
        queryClient.invalidateQueries({ queryKey: ["development-tickets"] });
        queryClient.invalidateQueries({ queryKey: ["my-erp-access"] });
        queryClient.invalidateQueries({ queryKey: ["pending-actions"] });
      }} />
    </div>
  );
}

function FilterSelect({ value, onChange, placeholder, options, firstOption = { value: "todos", label: "Todos" } }: { value: string; onChange: (value: string) => void; placeholder: string; options: { value: string; label: string }[]; firstOption?: { value: string; label: string } | null }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{firstOption ? <SelectItem value={firstOption.value}>{firstOption.label}</SelectItem> : null}{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>;
}

function HeaderFilterSelect({ value, onChange, label, options }: { value: string; onChange: (value: string) => void; label: string; options: { value: string; label: string }[] }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger className="h-8 min-w-24 bg-background" aria-label={label}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>;
}

function NewTicketDialog({ open, onOpenChange, userId, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; userId?: string; onCreated: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [appKey, setAppKey] = useState("supply");
  const [menuName, setMenuName] = useState("none");
  const [submenuName, setSubmenuName] = useState("none");
  const menuOptions = APP_NAVIGATION_OPTIONS[appKey] ?? [];
  const submenuOptions = menuOptions.find((menu) => menu.label === menuName)?.submenus ?? [];
  const createTicket = useMutation({
    mutationFn: async (form: HTMLFormElement) => {
      if (!userId) throw new Error("Sessão não encontrada");
      const values = new FormData(form);
      const payload = {
        reporter_id: userId,
        app_key: String(values.get("app_key")), ticket_type: String(values.get("ticket_type")),
        title: String(values.get("title")).trim(), description: String(values.get("description")).trim(),
        menu_name: menuName === "none" ? null : menuName, submenu_name: submenuName === "none" ? null : submenuName,
        priority: String(values.get("priority")), urgency: String(values.get("urgency")),
        expected_result: String(values.get("expected_result")).trim(),
      };
      const { data: ticket, error } = await supabase.from("development_tickets").insert(payload).select("id").single();
      if (error) throw error;
      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const storagePath = `${ticket.id}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("development-ticket-attachments").upload(storagePath, file);
        if (uploadError) throw uploadError;
        const { error: attachmentError } = await supabase.from("development_ticket_attachments").insert({ ticket_id: ticket.id, uploaded_by: userId, file_name: file.name, storage_path: storagePath, content_type: file.type || "application/octet-stream", file_size: file.size });
        if (attachmentError) throw attachmentError;
      }
    },
    onSuccess: () => { toast.success("Ticket aberto com sucesso"); setFile(null); setAppKey("supply"); setMenuName("none"); setSubmenuName("none"); onOpenChange(false); onCreated(); },
    onError: (error: Error) => toast.error(error.message),
  });
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogTrigger asChild><Button><Plus className="h-4 w-4" />Novo ticket</Button></DialogTrigger>
    <DialogContent className="max-w-2xl">
      <form onSubmit={(event) => { event.preventDefault(); createTicket.mutate(event.currentTarget); }} className="space-y-4">
        <DialogHeader><DialogTitle>Novo ticket</DialogTitle><DialogDescription>Registre uma melhoria ou um problema encontrado.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
           <FormSelect name="app_key" label="Aplicativo" value={appKey} onChange={(value) => { setAppKey(value); setMenuName("none"); setSubmenuName("none"); }} options={Object.entries(APP_NAMES).map(([value, label]) => ({ value, label }))} />
           <OptionalFormSelect label="Menu (opcional)" value={menuName} onChange={(value) => { setMenuName(value); setSubmenuName("none"); }} placeholder={menuOptions.length ? "Selecione" : "Sem menus disponíveis"} disabled={!menuOptions.length} options={menuOptions.map((menu) => menu.label)} />
           <OptionalFormSelect label="Submenu (opcional)" value={submenuName} onChange={setSubmenuName} placeholder={menuName === "none" ? "Selecione o menu" : submenuOptions.length ? "Selecione" : "Sem submenus disponíveis"} disabled={menuName === "none" || !submenuOptions.length} options={submenuOptions} />
          <FormSelect name="ticket_type" label="Tipo" options={[{ value: "melhoria", label: "Melhoria" }, { value: "bug", label: "Bug" }]} />
          <div className="sm:col-span-2"><Label htmlFor="ticket-title">Título</Label><Input id="ticket-title" name="title" minLength={3} maxLength={120} required /></div>
          <div className="sm:col-span-2"><Label htmlFor="ticket-description">Descrição</Label><Textarea id="ticket-description" name="description" minLength={10} maxLength={4000} className="min-h-28" required /></div>
          <FormSelect name="priority" label="Prioridade" options={Object.entries(PRIORITY_NAMES).map(([value, label]) => ({ value, label }))} />
          <FormSelect name="urgency" label="Urgência" options={[{ value: "normal", label: "Normal" }, { value: "urgente", label: "Urgente" }]} />
          <div className="sm:col-span-2"><Label htmlFor="ticket-result">Resultado esperado</Label><Textarea id="ticket-result" name="expected_result" minLength={5} maxLength={2000} required /></div>
          <div className="sm:col-span-2"><Label htmlFor="ticket-file">Anexo opcional (até 10 MB)</Label><Input id="ticket-file" type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></div>
        </div>
        <DialogFooter><Button type="submit" disabled={createTicket.isPending}>{createTicket.isPending ? "Salvando..." : "Abrir ticket"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

function FormSelect({ name, label, options, value, onChange }: { name: string; label: string; options: { value: string; label: string }[]; value?: string; onChange?: (value: string) => void }) {
  return <div><Label>{label}</Label><Select name={name} required value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>;
}

function OptionalFormSelect({ label, value, onChange, placeholder, disabled, options }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; disabled: boolean; options: string[] }) {
  return <div><Label>{label}</Label><Select value={value} onValueChange={onChange} disabled={disabled}><SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent><SelectItem value="none">Não informar</SelectItem>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>;
}

type TicketPageData = {
  profiles: { id: string; full_name: string | null; email: string | null }[];
  codeAdmins: { id: string; full_name: string | null; email: string | null }[];
  isAdmin: boolean;
  userId: string;
};

function TicketDetails({ ticket, onClose, data, onUpdated }: { ticket: Ticket | null; onClose: () => void; data?: TicketPageData; onUpdated: () => void }) {
  const [status, setStatus] = useState<TicketStatus>("aberto");
  const [assignee, setAssignee] = useState("none");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<{ url: string; name: string; contentType: string } | null>(null);
  useEffect(() => {
    if (!ticket) return;
    setStatus(ticket.status);
    setAssignee(ticket.assignee_id ?? "none");
    setNotes(ticket.admin_notes ?? "");
  }, [ticket]);
  const details = useQuery({
    queryKey: ["development-ticket-details", ticket?.id], enabled: Boolean(ticket),
    queryFn: async () => {
      if (!ticket) return { logs: [], attachments: [] };
      const [{ data: logs, error: logsError }, { data: attachments, error: attachmentsError }] = await Promise.all([
        supabase.from("development_ticket_logs").select("*").eq("ticket_id", ticket.id).order("created_at", { ascending: false }),
        supabase.from("development_ticket_attachments").select("*").eq("ticket_id", ticket.id).order("created_at"),
      ]);
      if (logsError) throw logsError;
      if (attachmentsError) throw attachmentsError;
      return { logs: logs ?? [], attachments: attachments ?? [] };
    },
  });
  const update = useMutation({
    mutationFn: async () => {
      if (!ticket) return;
      const { error } = await supabase.from("development_tickets").update({ status, assignee_id: assignee === "none" ? null : assignee, admin_notes: notes.trim() || null }).eq("id", ticket.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Ticket atualizado"); onClose(); onUpdated(); },
    onError: (error: Error) => toast.error(error.message),
  });
  const conclude = useMutation({
    mutationFn: async () => {
      if (!ticket || ticket.status !== "atendido" || ticket.reporter_id !== data?.userId) throw new Error("Este ticket não está disponível para conclusão");
      const { error } = await supabase.from("development_tickets").update({ status: "concluido" }).eq("id", ticket.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Ticket concluído"); onClose(); onUpdated(); },
    onError: (error: Error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: async () => {
      if (!ticket || ticket.status !== "aberto" || ticket.reporter_id !== data?.userId) throw new Error("Somente o solicitante pode excluir seu ticket em aberto");
      const { error } = await supabase.from("development_tickets").update({ status: "excluido" }).eq("id", ticket.id).eq("reporter_id", data.userId).eq("status", "aberto");
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Ticket excluído e mantido no histórico"); onClose(); onUpdated(); },
    onError: (error: Error) => toast.error(error.message),
  });
  async function download(path: string, name: string) {
    const { data: signed, error } = await supabase.storage.from("development-ticket-attachments").createSignedUrl(path, 60);
    if (error) return toast.error(error.message);
    const anchor = document.createElement("a"); anchor.href = signed.signedUrl; anchor.download = name; anchor.click();
  }
  async function openPreview(path: string, name: string, contentType: string | null) {
    const { data: signed, error } = await supabase.storage.from("development-ticket-attachments").createSignedUrl(path, 300);
    if (error) return toast.error(error.message);
    setPreview({ url: signed.signedUrl, name, contentType: contentType ?? "application/octet-stream" });
  }
  return <>
    <Dialog open={Boolean(ticket)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {ticket ? <div className="space-y-5">
        <DialogHeader><DialogTitle>#{ticket.ticket_number} — {ticket.title}</DialogTitle><DialogDescription>{APP_NAMES[ticket.app_key]} · {ticket.ticket_type === "bug" ? "Bug" : "Melhoria"} · Solicitante: {data?.profiles.find((profile) => profile.id === ticket.reporter_id)?.full_name || data?.profiles.find((profile) => profile.id === ticket.reporter_id)?.email || "Usuário"} · {new Date(ticket.created_at).toLocaleString("pt-BR")}</DialogDescription></DialogHeader>
        {ticket.menu_name || ticket.submenu_name ? <div className="flex flex-wrap gap-2">{ticket.menu_name ? <Badge variant="outline">Menu: {ticket.menu_name}</Badge> : null}{ticket.submenu_name ? <Badge variant="outline">Submenu: {ticket.submenu_name}</Badge> : null}</div> : null}
        <div className="grid gap-4 sm:grid-cols-2"><div><p className="text-xs font-semibold text-muted-foreground">Descrição</p><p className="mt-1 whitespace-pre-wrap text-sm">{ticket.description}</p></div><div><p className="text-xs font-semibold text-muted-foreground">Resultado esperado</p><p className="mt-1 whitespace-pre-wrap text-sm">{ticket.expected_result}</p></div></div>
        <div className="flex flex-wrap gap-2"><Badge variant="status">{STATUS_NAMES[ticket.status]}</Badge><Badge variant="outline">Prioridade {PRIORITY_NAMES[ticket.priority]}</Badge>{ticket.urgency === "urgente" ? <Badge variant="destructive">Urgente</Badge> : null}</div>
        {details.data?.attachments.length ? <div><p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Paperclip className="h-4 w-4" />Anexos</p><div className="flex flex-wrap gap-2">{details.data.attachments.map((attachment) => <Button key={attachment.id} variant="outline" size="sm" onClick={() => openPreview(attachment.storage_path, attachment.file_name, attachment.content_type)}><Eye className="h-4 w-4" /><span className="max-w-64 truncate">{attachment.file_name}</span></Button>)}</div></div> : null}
        {data?.isAdmin && ticket.status !== "concluido" && ticket.status !== "excluido" ? <div className="space-y-3 border-t pt-4"><h3 className="font-semibold">Gestão do ticket</h3><div className="grid gap-3 sm:grid-cols-2"><div><Label>Situação</Label><FilterSelect value={status} onChange={(value) => setStatus(value as TicketStatus)} placeholder="Situação" options={Object.entries(ADMIN_STATUS_NAMES).map(([value, label]) => ({ value, label }))} firstOption={null} /></div><div><Label>Responsável pela execução</Label><FilterSelect value={assignee} onChange={setAssignee} placeholder="Responsável pela execução" options={(data.codeAdmins ?? []).map((profile) => ({ value: profile.id, label: profile.full_name || profile.email || "Usuário" }))} firstOption={{ value: "none", label: "Sem responsável" }} /></div></div><div><Label htmlFor="admin-notes">Observações</Label><Textarea id="admin-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={4000} /></div><Button onClick={() => update.mutate()} disabled={update.isPending}>Salvar andamento</Button></div> : ticket.admin_notes ? <div><p className="text-sm font-semibold">Observações</p><p className="mt-1 whitespace-pre-wrap text-sm">{ticket.admin_notes}</p></div> : null}
        {ticket.status === "atendido" && ticket.reporter_id === data?.userId ? <div className="space-y-2 border-t pt-4"><p className="text-sm text-muted-foreground">Confirme se a correção ou melhoria foi entregue conforme esperado.</p><Button onClick={() => conclude.mutate()} disabled={conclude.isPending}>{conclude.isPending ? "Concluindo..." : "Marcar como concluído"}</Button></div> : null}
        {ticket.status === "aberto" && ticket.reporter_id === data?.userId ? <div className="flex justify-end border-t pt-4"><AlertDialog><AlertDialogTrigger asChild><Button variant="destructive"><Trash2 className="h-4 w-4" />Excluir ticket</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir este ticket?</AlertDialogTitle><AlertDialogDescription>Ele permanecerá no histórico com a situação “Excluído” e deixará de ser uma pendência para o executor.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate()} disabled={remove.isPending}>{remove.isPending ? "Excluindo..." : "Confirmar exclusão"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div> : null}
        {details.data?.logs.length ? <div className="border-t pt-4"><p className="mb-2 flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" />Histórico</p><div className="space-y-2">{details.data.logs.map((log) => <div key={log.id} className="rounded-md bg-muted p-2 text-xs">{log.previous_status !== log.new_status ? `${STATUS_NAMES[log.previous_status as TicketStatus] ?? "—"} → ${STATUS_NAMES[log.new_status as TicketStatus] ?? "—"}` : "Responsável ou observação atualizados"}<span className="ml-2 text-muted-foreground">{new Date(log.created_at).toLocaleString("pt-BR")}</span></div>)}</div></div> : null}
        </div> : null}
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(preview)} onOpenChange={(open) => { if (!open) setPreview(null); }}>
      <DialogContent className="flex h-[90vh] w-[94vw] max-w-5xl flex-col overflow-hidden p-4 sm:p-6">
        <DialogHeader className="shrink-0 pr-8"><DialogTitle className="truncate">{preview?.name}</DialogTitle><DialogDescription>Visualização do anexo</DialogDescription></DialogHeader>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/30">
          {preview?.contentType.startsWith("image/") ? <img src={preview.url} alt={`Anexo ${preview.name}`} className="max-h-full max-w-full object-contain" /> : null}
          {preview?.contentType === "application/pdf" ? <iframe src={preview.url} title={`Anexo ${preview.name}`} className="h-full w-full border-0" /> : null}
          {preview && !preview.contentType.startsWith("image/") && preview.contentType !== "application/pdf" ? <p className="px-6 text-center text-sm text-muted-foreground">Este formato não possui visualização. Use o botão Baixar anexo.</p> : null}
        </div>
        <DialogFooter className="shrink-0 flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => setPreview(null)}>Fechar</Button>
          {preview ? <Button onClick={() => { const anchor = document.createElement("a"); anchor.href = preview.url; anchor.download = preview.name; anchor.click(); }}><Download className="h-4 w-4" />Baixar anexo</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}