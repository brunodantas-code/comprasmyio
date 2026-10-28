import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CodeXml, Download, Eye, History, MessageCircleQuestion, Paperclip, Plus, Send, Trash2, Pencil } from "lucide-react";
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
import { AppHeader } from "@/components/app-header";
import { MilestoneTimeline } from "@/components/milestone-timeline";
import { currentCodeObservations, proposedSolutionSchema, codeObservationSchema } from "@/lib/code-records";

type TicketStatus = "aberto" | "em_atendimento" | "aguardando_resposta" | "atendido" | "concluido" | "excluido";
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
  proposed_solution: string | null;
  created_at: string;
  updated_at: string;
};

type TicketMessage = {
  id: string;
  ticket_id: string;
  author_id: string;
  message_type: "question" | "answer";
  parent_message_id: string | null;
  message: string;
  created_at: string;
};

const APP_NAMES: Record<string, string> = {
  supply: "Supply",
  cash_flow: "Cash Flow",
  crm: "CRM",
  legal: "Legal",
  rh: "RH",
  development: "Code",
  site_survey: "Site Survey",
};
const STATUS_NAMES: Record<TicketStatus, string> = {
  aberto: "Em aberto",
  em_atendimento: "Em atendimento",
  aguardando_resposta: "Aguardando resposta",
  atendido: "Atendido",
  concluido: "Concluído",
  excluido: "Excluído",
};
const ADMIN_STATUS_NAMES: Record<Exclude<TicketStatus, "concluido" | "excluido">, string> = {
  aberto: "Em aberto",
  em_atendimento: "Em atendimento",
  aguardando_resposta: "Aguardando resposta",
  atendido: "Atendido",
};
const PRIORITY_NAMES = { baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica" } as const;

function validateImages(files: File[]) {
  if (files.some((file) => !file.type.startsWith("image/") || file.size === 0 || file.size > 10 * 1024 * 1024)) {
    throw new Error("Selecione apenas imagens de até 10 MB cada.");
  }
}

async function uploadTicketImages(ticketId: string, userId: string, files: File[], messageId?: string) {
  validateImages(files);
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${ticketId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("development-ticket-attachments").upload(storagePath, file, { contentType: file.type });
    if (uploadError) throw uploadError;
    const { error: attachmentError } = await supabase.from("development_ticket_attachments").insert({ ticket_id: ticketId, uploaded_by: userId, file_name: file.name, storage_path: storagePath, content_type: file.type, file_size: file.size, message_id: messageId ?? null });
    if (attachmentError) {
      await supabase.storage.from("development-ticket-attachments").remove([storagePath]);
      throw attachmentError;
    }
  }
}

export const Route = createFileRoute("/_authenticated/development")({
  validateSearch: (search: Record<string, unknown>) => ({
    ticket: typeof search.ticket === "string" ? search.ticket : undefined,
  }),
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
  const navigate = useNavigate();
  const routeSearch = Route.useSearch();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [search, setSearch] = useState("");
  const [appFilter, setAppFilter] = useState("todos");
  const [reporterFilter, setReporterFilter] = useState("todos");
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
      && (reporterFilter === "todos" || ticket.reporter_id === reporterFilter)
      && (appFilter === "todos" || ticket.app_key === appFilter)
      && (typeFilter === "todos" || ticket.ticket_type === typeFilter)
      && (priorityFilter === "todos" || ticket.priority === priorityFilter)
      && (statusFilter === "todos" ? ticket.status !== "excluido" : ticket.status === statusFilter);
  }), [appFilter, data?.tickets, priorityFilter, reporterFilter, search, statusFilter, typeFilter]);
  const profileNames = useMemo(() => new Map((data?.profiles ?? []).map((profile) => [profile.id, profile.full_name || profile.email || "Usuário"])), [data?.profiles]);
  useEffect(() => {
    if (!routeSearch.ticket || !data?.tickets.length) return;
    const linkedTicket = data.tickets.find((ticket) => ticket.id === routeSearch.ticket);
    if (linkedTicket) setSelectedTicket(linkedTicket);
  }, [data?.tickets, routeSearch.ticket]);

  const closeTicket = () => {
    setSelectedTicket(null);
    if (routeSearch.ticket) navigate({ to: "/development", search: { ticket: undefined }, replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader logo={<MyioAppLogo appName="Code" className="text-base sm:text-2xl" />} />
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
                   <TableRow><TableHead>Nº</TableHead><TableHead>Solicitante</TableHead><TableHead>Aplicativo</TableHead><TableHead>Tipo</TableHead><TableHead>Título</TableHead><TableHead>Prioridade</TableHead><TableHead>Situação</TableHead><TableHead>Data</TableHead></TableRow>
                   <TableRow>
                     <TableHead className="py-1" />
                     <TableHead className="py-1"><HeaderFilterSelect value={reporterFilter} onChange={setReporterFilter} label="Filtrar por solicitante" options={[...new Set((data?.tickets ?? []).map((ticket) => ticket.reporter_id))].map((id) => ({ value: id, label: profileNames.get(id) ?? "Usuário" })).sort((a,b) => a.label.localeCompare(b.label, "pt-BR"))} /></TableHead>
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
                    <TableCell><Badge variant="outline" className="font-normal">{ticket.ticket_type === "bug" ? "Bug" : "Melhoria"}</Badge></TableCell>
                    <TableCell className="max-w-xs truncate font-medium">{ticket.title}</TableCell>
                    <TableCell>{PRIORITY_NAMES[ticket.priority]}</TableCell>
                    <TableCell><Badge variant="outline" className="font-normal">{STATUS_NAMES[ticket.status]}</Badge></TableCell>
                    <TableCell>{new Date(ticket.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  </TableRow>
                 ))}{!filteredTickets.length ? <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Nenhum ticket encontrado.</TableCell></TableRow> : null}</TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
      <TicketDetails ticket={selectedTicket} onClose={closeTicket} data={data} onUpdated={() => {
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
   const [files, setFiles] = useState<File[]>([]);
   const [fileInputKey, setFileInputKey] = useState(0);
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
       validateImages(files);
      const { data: ticket, error } = await supabase.from("development_tickets").insert(payload).select("id").single();
      if (error) throw error;
       if (files.length) {
         try {
           await uploadTicketImages(ticket.id, userId, files);
         } catch (uploadError) {
           throw new Error(`Ticket aberto, mas não foi possível anexar todas as imagens: ${uploadError instanceof Error ? uploadError.message : "erro no envio"}`);
         }
       }
    },
     onSuccess: () => { toast.success("Ticket aberto com sucesso"); setFiles([]); setFileInputKey((key) => key + 1); setAppKey("supply"); setMenuName("none"); setSubmenuName("none"); onOpenChange(false); onCreated(); },
     onError: (error: Error) => {
       toast.error(error.message);
       if (error.message.startsWith("Ticket aberto")) {
         setFiles([]);
         setFileInputKey((key) => key + 1);
         onOpenChange(false);
         onCreated();
       }
     },
  });
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogTrigger asChild><Button variant="action"><Plus className="h-4 w-4" />Novo ticket</Button></DialogTrigger>
     <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
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
           <div className="sm:col-span-2"><Label htmlFor="ticket-file">Prints e fotos (até 10 MB por imagem)</Label><Input key={fileInputKey} id="ticket-file" type="file" accept="image/*" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></div>
        </div>
        <DialogFooter><Button type="submit" variant="action" disabled={createTicket.isPending}>{createTicket.isPending ? "Salvando..." : "Abrir ticket"}</Button></DialogFooter>
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
  const [solution, setSolution] = useState("");
  const [observation, setObservation] = useState("");
  const [deletingObservation, setDeletingObservation] = useState<string | null>(null);
  const [editingObservation, setEditingObservation] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [replyToId, setReplyToId] = useState("");
  const [reporterMode, setReporterMode] = useState<"question" | "answer">("answer");
   const [messageFiles, setMessageFiles] = useState<File[]>([]);
   const [messageFileInputKey, setMessageFileInputKey] = useState(0);
  const [preview, setPreview] = useState<{ url: string; name: string; contentType: string } | null>(null);
  useEffect(() => {
    if (!ticket) return;
    setStatus(ticket.status);
    setAssignee(ticket.assignee_id ?? "none");
    setNotes(ticket.admin_notes ?? "");
    setSolution(ticket.proposed_solution ?? "");
    setEditingSolution(!ticket.proposed_solution?.trim());
    setObservation(""); setEditingObservation(null);
     setMessage("");
     setReplyToId("");
     setReporterMode("answer");
     setMessageFiles([]);
     setMessageFileInputKey((key) => key + 1);
   }, [ticket]);
  const details = useQuery({
    queryKey: ["development-ticket-details", ticket?.id], enabled: Boolean(ticket),
    queryFn: async () => {
      if (!ticket) return { logs: [], attachments: [], messages: [] };
      const [{ data: logs, error: logsError }, { data: attachments, error: attachmentsError }, { data: messages, error: messagesError }] = await Promise.all([
        supabase.from("development_ticket_logs").select("*").eq("ticket_id", ticket.id).order("created_at", { ascending: false }),
        supabase.from("development_ticket_attachments").select("*").eq("ticket_id", ticket.id).order("created_at"),
        supabase.from("development_ticket_messages").select("*").eq("ticket_id", ticket.id).order("created_at"),
      ]);
      if (logsError) throw logsError;
      if (attachmentsError) throw attachmentsError;
      if (messagesError) throw messagesError;
      return { logs: logs ?? [], attachments: attachments ?? [], messages: (messages ?? []) as TicketMessage[] };
    },
  });
  const messages = details.data?.messages ?? [];
  const personName = (id: string | null | undefined) => { const profile = data?.profiles.find((item) => item.id === id); return profile?.full_name || profile?.email || "Usuário"; };
  const observations = currentCodeObservations(details.data?.logs ?? []);
  const canRecord = Boolean(data?.isAdmin && ticket && ticket.status !== "excluido");
  const [editingSolution, setEditingSolution] = useState(false);
  const saveSolution = useMutation({
    mutationFn: async () => {
      if (!ticket || !canRecord) throw new Error("Sem permissão para registrar a solução.");
      const value = proposedSolutionSchema.parse(solution);
      const { error } = await supabase.from("development_tickets").update({ proposed_solution: value || null }).eq("id", ticket.id);
      if (error) throw error;
    },
    onSuccess: async () => { toast.success("Solução salva"); setEditingSolution(!solution.trim()); await details.refetch(); onUpdated(); },
    onError: (error: Error) => toast.error(error.message),
  });
  const deleteObservation = useMutation({
    mutationFn: async (observationId: string) => {
      if (!ticket || !canRecord) throw new Error("Sem permissão para excluir observações.");
      const { error } = await supabase.rpc("delete_code_observation", { _ticket_id: ticket.id, _observation_id: observationId });
      if (error) throw error;
    },
    onSuccess: async () => { toast.success("Observação excluída"); if (editingObservation === deletingObservation) { setEditingObservation(null); setObservation(""); } setDeletingObservation(null); await details.refetch(); onUpdated(); },
    onError: (error: Error) => toast.error(error.message),
  });
  const flushPendingImages = async () => {
    if (!ticket || !data?.userId || !messageFiles.length) return;
    await uploadTicketImages(ticket.id, data.userId, messageFiles);
    setMessageFiles([]);
    setMessageFileInputKey((key) => key + 1);
  };
  const saveObservation = useMutation({
    mutationFn: async () => {
      if (!ticket || !canRecord) throw new Error("Sem permissão para registrar observações.");
      const text = codeObservationSchema.parse(observation);
      validateImages(messageFiles);
      const { error } = await supabase.rpc("save_code_observation", { _ticket_id: ticket.id, _text: text, _observation_id: editingObservation ?? undefined });
      if (error) throw error;
      await flushPendingImages();
    },
    onSuccess: async () => { toast.success(editingObservation ? "Observação atualizada" : "Observação adicionada"); setObservation(""); setEditingObservation(null); await details.refetch(); onUpdated(); },
    onError: (error: Error) => toast.error(error.message),
  });
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const editMessage = useMutation({
    mutationFn: async () => {
      if (!editingMessageId || !editingMessageText.trim()) throw new Error("Digite o texto da mensagem");
      const { error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ error: Error | null }>)("edit_code_message", { _message_id: editingMessageId, _text: editingMessageText.trim() });
      if (error) throw error;
    },
    onSuccess: async () => { toast.success("Mensagem atualizada"); setEditingMessageId(null); setEditingMessageText(""); await details.refetch(); onUpdated(); },
    onError: (error: Error) => toast.error(error.message),
  });
  const answeredQuestionIds = new Set(messages.filter((entry) => entry.message_type === "answer" && entry.parent_message_id).map((entry) => entry.parent_message_id));
  const pendingQuestions = messages.filter((entry) => entry.message_type === "question" && entry.author_id !== data?.userId && !answeredQuestionIds.has(entry.id));
  const canAsk = Boolean(data?.isAdmin && ticket && !["atendido", "concluido", "excluido"].includes(ticket.status));
  const isReporter = Boolean(ticket && ticket.reporter_id === data?.userId && !["concluido", "excluido"].includes(ticket.status));
  const canAnswer = Boolean((isReporter || canAsk) && pendingQuestions.length && reporterMode === "answer");
  const canAskReporter = Boolean(isReporter && (reporterMode === "question" || !pendingQuestions.length));
  const shouldAnswer = Boolean(canAnswer && !canAskReporter);
  const canAttach = Boolean(ticket && (data?.isAdmin || ticket.reporter_id === data?.userId) && !["concluido", "excluido"].includes(ticket.status));
  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!ticket || !data?.userId || (!message.trim() && !messageFiles.length)) throw new Error("Digite uma mensagem ou selecione uma imagem");
      if (!canAsk && !canAnswer && !canAttach) throw new Error("Não é possível enviar neste chamado");
       validateImages(messageFiles);
      if (!message.trim()) {
        await uploadTicketImages(ticket.id, data.userId, messageFiles);
        return "attachments" as const;
      }
      if (!canAsk && !canAnswer && !canAskReporter) throw new Error("Não é possível enviar neste chamado");
      const parentId = shouldAnswer ? (pendingQuestions.some((entry) => entry.id === replyToId) ? replyToId : pendingQuestions[0]?.id) : null;
       const { data: savedMessage, error } = await supabase.from("development_ticket_messages").insert({
        ticket_id: ticket.id,
        author_id: data.userId,
        message_type: shouldAnswer ? "answer" : "question",
        parent_message_id: parentId,
        message: message.trim(),
       }).select("id").single();
      if (error) throw error;
       if (messageFiles.length) {
         try {
           await uploadTicketImages(ticket.id, data.userId, messageFiles, savedMessage.id);
         } catch (uploadError) {
           throw new Error(`Mensagem enviada, mas não foi possível anexar todas as imagens: ${uploadError instanceof Error ? uploadError.message : "erro no envio"}`);
         }
       }
       return "message" as const;
    },
    onSuccess: async (result) => {
      toast.success(result === "attachments" ? "Imagens anexadas" : shouldAnswer ? "Resposta enviada" : canAskReporter ? "Pergunta enviada" : "Pergunta enviada ao solicitante");
      setMessage("");
      setReplyToId("");
      setReporterMode("answer");
       setMessageFiles([]);
       setMessageFileInputKey((key) => key + 1);
      await details.refetch();
      onUpdated();
    },
     onError: (error: Error) => {
       toast.error(error.message);
       if (error.message.startsWith("Mensagem enviada")) {
         setMessage("");
         setMessageFiles([]);
         setMessageFileInputKey((key) => key + 1);
         void details.refetch();
         onUpdated();
       }
     },
  });
  const update = useMutation({
    mutationFn: async () => {
      if (!ticket) return;
      validateImages(messageFiles);
      const { error } = await supabase.from("development_tickets").update({ status, assignee_id: assignee === "none" ? null : assignee, admin_notes: notes.trim() || null, proposed_solution: proposedSolutionSchema.parse(solution) || null }).eq("id", ticket.id);
      if (error) throw error;
      await flushPendingImages();
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
        <div className="flex flex-wrap gap-2"><Badge variant="outline" className="font-normal">{STATUS_NAMES[ticket.status]}</Badge><Badge variant="outline">Prioridade {PRIORITY_NAMES[ticket.priority]}</Badge>{ticket.urgency === "urgente" ? <Badge variant="destructive">Urgente</Badge> : null}</div>
         {details.data?.attachments.some((attachment) => !attachment.message_id) ? <div><p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Paperclip className="h-4 w-4" />Anexos do chamado</p><div className="flex flex-wrap gap-2">{details.data.attachments.filter((attachment) => !attachment.message_id).map((attachment) => <TicketAttachmentThumb key={attachment.id} attachment={attachment} onOpen={() => openPreview(attachment.storage_path, attachment.file_name, attachment.content_type)} />)}</div></div> : null}
        <section className="space-y-2 border-t pt-4"><div className="flex items-center justify-between gap-2"><Label htmlFor="ticket-solution">Solução Proposta <span className="text-muted-foreground">(opcional)</span></Label>{canRecord && !editingSolution ? <Button type="button" variant="ghost" size="compactIcon" title="Editar Solução Proposta" aria-label="Editar Solução Proposta" onClick={() => setEditingSolution(true)}><Pencil className="h-3.5 w-3.5" /></Button> : null}</div><Textarea id="ticket-solution" value={solution} onChange={(event) => setSolution(event.target.value)} maxLength={4000} readOnly={!canRecord || !editingSolution} className={`min-h-24 ${!canRecord || !editingSolution ? "bg-muted/40 cursor-default" : ""}`} />{canRecord && editingSolution && <div className="flex justify-end gap-2">{ticket.proposed_solution?.trim() ? <Button variant="outline" onClick={() => { setSolution(ticket.proposed_solution ?? ""); setEditingSolution(false); }}>Cancelar</Button> : null}<Button onClick={() => saveSolution.mutate()} disabled={saveSolution.isPending}>Salvar solução</Button></div>}</section>
         {messages.length || canAttach ? <div className="space-y-3 border-t pt-4"><p className="flex items-center gap-2 text-sm font-semibold"><MessageCircleQuestion className="h-4 w-4" />Conversa</p>{messages.length ? <div className="space-y-2">{messages.map((entry) => <div key={entry.id} className={`rounded-md border p-3 text-sm ${entry.message_type === "question" ? "border-border bg-muted/50" : "border-primary/40 bg-primary/10"}`}><div className="mb-1 flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">{entry.message_type === "question" ? entry.author_id === ticket.reporter_id ? "Solicitante" : "Admin" : "Solicitante"} · {data?.profiles.find((profile) => profile.id === entry.author_id)?.full_name || data?.profiles.find((profile) => profile.id === entry.author_id)?.email || "Usuário"}</span><span className="flex items-center gap-1 text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString("pt-BR")}{entry.author_id === data?.userId && canAttach && editingMessageId !== entry.id ? <Button type="button" variant="ghost" size="compactIcon" title={entry.message_type === "question" ? "Editar pergunta" : "Editar resposta"} aria-label={entry.message_type === "question" ? "Editar pergunta" : "Editar resposta"} onClick={() => { setEditingMessageId(entry.id); setEditingMessageText(entry.message); }}><Pencil className="h-3.5 w-3.5" /></Button> : null}</span></div>{editingMessageId === entry.id ? <div className="space-y-2"><Textarea value={editingMessageText} onChange={(event) => setEditingMessageText(event.target.value)} maxLength={4000} className="min-h-24 bg-background" /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { setEditingMessageId(null); setEditingMessageText(""); }}>Cancelar</Button><Button variant="outline" onClick={() => editMessage.mutate()} disabled={editMessage.isPending || !editingMessageText.trim()}>Salvar</Button></div></div> : <p className="whitespace-pre-wrap">{entry.message}</p>}{details.data?.attachments.some((attachment) => attachment.message_id === entry.id) ? <div className="mt-2 flex flex-wrap gap-2">{details.data.attachments.filter((attachment) => attachment.message_id === entry.id).map((attachment) => <TicketAttachmentThumb key={attachment.id} attachment={attachment} onOpen={() => openPreview(attachment.storage_path, attachment.file_name, attachment.content_type)} />)}</div> : null}{entry.message_type === "question" && !answeredQuestionIds.has(entry.id) ? <Badge variant="destructive" className="mt-2">Aguardando resposta</Badge> : null}</div>)}</div> : <p className="text-sm text-muted-foreground">Nenhuma mensagem registrada.</p>}{canAttach ? <div>{(isReporter || canAsk) && pendingQuestions.length > 0 ? <div className="mb-3 flex gap-2"><Button size="sm" variant={reporterMode === "answer" ? "default" : "outline"} className={reporterMode === "answer" ? "!bg-primary !text-primary-foreground hover:!bg-primary/90 hover:!text-primary-foreground" : undefined} onClick={() => setReporterMode("answer")}>Responder</Button><Button size="sm" variant={reporterMode === "question" ? "default" : "outline"} className={reporterMode === "question" ? "!bg-primary !text-primary-foreground hover:!bg-primary/90 hover:!text-primary-foreground" : undefined} onClick={() => setReporterMode("question")}>Nova pergunta</Button></div> : null}{canAnswer && pendingQuestions.length > 1 ? <div className="mb-3"><Label htmlFor="ticket-reply-to">Responder à pergunta</Label><Select value={pendingQuestions.some((entry) => entry.id === replyToId) ? replyToId : pendingQuestions[0].id} onValueChange={setReplyToId}><SelectTrigger id="ticket-reply-to" className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{pendingQuestions.map((entry, index) => <SelectItem key={entry.id} value={entry.id}>{`Pergunta ${index + 1}: ${entry.message.slice(0, 70)}`}</SelectItem>)}</SelectContent></Select></div> : null}{shouldAnswer || canAskReporter || canAsk ? <><Label htmlFor="ticket-message">{shouldAnswer ? "Responder à pergunta" : canAskReporter ? "Nova pergunta" : "Pergunta ao solicitante"}</Label><Textarea id="ticket-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} className="mt-1 min-h-24" placeholder={shouldAnswer ? "Digite sua resposta" : canAskReporter ? "Digite sua nova pergunta" : "Digite a dúvida que precisa ser esclarecida"} /></> : null}<Label htmlFor="ticket-message-images" className="mt-3 block">Prints e fotos (até 10 MB por imagem)</Label><Input key={messageFileInputKey} id="ticket-message-images" type="file" accept="image/*" multiple onChange={(event) => setMessageFiles(Array.from(event.target.files ?? []))} className="mt-1" />{messageFiles.length ? <p className="mt-1 text-xs text-muted-foreground">{messageFiles.length === 1 ? "1 imagem selecionada" : `${messageFiles.length} imagens selecionadas`} — será anexada ao clicar em Anexar imagens, Adicionar observação ou Salvar.</p> : null}<div className="mt-2 flex justify-end"><Button onClick={() => sendMessage.mutate()} disabled={sendMessage.isPending || (!message.trim() && !messageFiles.length)}><Send className="h-4 w-4" />{sendMessage.isPending ? "Enviando..." : !message.trim() ? "Anexar imagens" : shouldAnswer ? "Enviar resposta" : "Enviar pergunta"}</Button></div></div> : null}</div> : null}
        {data?.isAdmin && ticket.status !== "concluido" && ticket.status !== "excluido" ? <div className="space-y-3 border-t pt-4"><h3 className="font-semibold">Gestão do ticket</h3><div className="grid gap-3 sm:grid-cols-2"><div><Label>Situação</Label><FilterSelect value={status} onChange={(value) => setStatus(value as TicketStatus)} placeholder="Situação" options={Object.entries(ADMIN_STATUS_NAMES).map(([value, label]) => ({ value, label }))} firstOption={null} /></div><div><Label>Responsável pela execução</Label><FilterSelect value={assignee} onChange={setAssignee} placeholder="Responsável pela execução" options={(data.codeAdmins ?? []).map((profile) => ({ value: profile.id, label: profile.full_name || profile.email || "Usuário" }))} firstOption={{ value: "none", label: "Sem responsável" }} /></div></div><Button onClick={() => update.mutate()} disabled={update.isPending}>Salvar andamento</Button></div> : null}
        {ticket.status === "atendido" && ticket.reporter_id === data?.userId ? <div className="space-y-2 border-t pt-4"><p className="text-sm text-muted-foreground">Confirme se a correção ou melhoria foi entregue conforme esperado.</p><Button onClick={() => conclude.mutate()} disabled={conclude.isPending}>{conclude.isPending ? "Concluindo..." : "Marcar como concluído"}</Button></div> : null}
        {ticket.status === "aberto" && ticket.reporter_id === data?.userId ? <div className="flex justify-end border-t pt-4"><AlertDialog><AlertDialogTrigger asChild><Button variant="destructive"><Trash2 className="h-4 w-4" />Excluir ticket</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir este ticket?</AlertDialogTitle><AlertDialogDescription>Ele permanecerá no histórico com a situação “Excluído” e deixará de ser uma pendência para o executor.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate()} disabled={remove.isPending}>{remove.isPending ? "Excluindo..." : "Confirmar exclusão"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div> : null}
        <section className="space-y-3 border-t pt-4"><h3 className="text-sm font-semibold">Observações</h3>
          {ticket.admin_notes && !observations.some((entry) => entry.observation_id === ticket.id) && <div className="space-y-2"><div className="flex items-center justify-between"><Label>Observação anterior</Label><div className="flex items-center gap-1">{canRecord && <Button variant="ghost" size="compactIcon" title="Editar observação anterior" aria-label="Editar observação anterior" onClick={() => { setEditingObservation(ticket.id); setObservation(ticket.admin_notes ?? ""); }}><Pencil className="h-3.5 w-3.5" /></Button>}{canRecord && <Button variant="ghost" size="compactIcon" title="Excluir observação" aria-label="Excluir observação" onClick={() => setDeletingObservation(ticket.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}</div></div><p className="whitespace-pre-wrap text-sm">{ticket.admin_notes}</p></div>}
          {observations.map((entry) => <div key={entry.observation_id} className="border-b border-border pb-3"><div className="flex items-start justify-between gap-2"><p className="whitespace-pre-wrap break-words text-sm">{entry.note}</p><div className="flex shrink-0 items-center gap-1">{canRecord && <Button variant="ghost" size="compactIcon" aria-label="Editar observação" title="Editar observação" onClick={() => { setEditingObservation(entry.observation_id); setObservation(entry.note ?? ""); }}><Pencil className="h-3.5 w-3.5" /></Button>}{canRecord && <Button variant="ghost" size="compactIcon" aria-label="Excluir observação" title="Excluir observação" onClick={() => setDeletingObservation(entry.observation_id)}><Trash2 className="h-3.5 w-3.5" /></Button>}</div></div><p className="mt-1 text-xs text-muted-foreground">{data?.profiles.find((profile) => profile.id === entry.changed_by)?.full_name ?? "Usuário"} · {new Date(entry.created_at).toLocaleString("pt-BR")}</p></div>)}
          {canRecord && <div className="space-y-2"><Label htmlFor="ticket-observation">{editingObservation ? "Editar observação" : "Nova observação"}</Label><Textarea id="ticket-observation" value={observation} onChange={(event) => setObservation(event.target.value)} maxLength={4000} /><div className="flex justify-end gap-2">{editingObservation && <Button variant="outline" onClick={() => { setEditingObservation(null); setObservation(""); }}>Cancelar</Button>}<Button onClick={() => saveObservation.mutate()} disabled={saveObservation.isPending || !observation.trim()}>{editingObservation ? "Salvar observação" : "Adicionar observação"}</Button></div></div>}
        </section>
        <AlertDialog open={!!deletingObservation} onOpenChange={(open) => { if (!open) setDeletingObservation(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir esta observação?</AlertDialogTitle><AlertDialogDescription>A observação sai da lista e a exclusão fica registrada no Histórico.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); if (deletingObservation) deleteObservation.mutate(deletingObservation); }} disabled={deleteObservation.isPending}>{deleteObservation.isPending ? "Excluindo..." : "Excluir"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        <div className="border-t pt-4"><p className="mb-2 flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" />Histórico</p><MilestoneTimeline entries={[{ id: `opened-${ticket.id}`, created_at: ticket.created_at, text: `Ticket aberto por ${personName(ticket.reporter_id)} (Solicitante)` }, ...(details.data?.logs ?? []).filter((log) => log.event_type || log.previous_status !== log.new_status || log.previous_assignee_id !== log.new_assignee_id || log.note).map((log) => ({ id: log.id, created_at: log.created_at, text: (log.event_type === "observation_added" ? `Observação adicionada: ${log.note ?? ""}` : log.event_type === "observation_deleted" ? `Observação excluída: ${log.previous_note ?? ""}` : log.event_type === "observation_edited" ? `Observação alterada\nAntes: ${log.previous_note ?? ""}\nDepois: ${log.note ?? ""}` : log.event_type === "question_edited" || log.event_type === "answer_edited" ? `${log.event_type === "question_edited" ? "Pergunta alterada" : "Resposta alterada"}\nAntes: ${log.previous_note ?? ""}\nDepois: ${log.note ?? ""}` : log.event_type === "solution_updated" ? (log.previous_note?.trim() ? `Solução Proposta alterada\nAntes: ${log.previous_note}\nDepois: ${log.note ?? "—"}` : `Solução Proposta registrada: ${log.note ?? ""}`) : log.previous_status !== log.new_status ? `${STATUS_NAMES[log.previous_status as TicketStatus] ?? "—"} → ${STATUS_NAMES[log.new_status as TicketStatus] ?? "—"}` : log.note ? `Responsável ou observação atualizados: ${log.note}` : `Responsável atualizado: ${log.new_assignee_id ? personName(log.new_assignee_id) : "—"}`) + (log.previous_assignee_id !== log.new_assignee_id && log.new_assignee_id && (log.event_type || log.previous_status !== log.new_status || log.note) ? `\nResponsável: ${personName(log.new_assignee_id)}` : "") + `\npor ${personName(log.changed_by)}` })), ...messages.map((entry) => ({ id: entry.id, created_at: entry.created_at, text: entry.message_type === "question" ? entry.author_id === ticket.reporter_id ? "Pergunta enviada pelo Solicitante" : "Pergunta enviada pelo Admin" : "Resposta enviada pelo Solicitante" }))]} /></div>
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

function TicketAttachmentThumb({ attachment, onOpen }: { attachment: { storage_path: string; file_name: string; content_type: string | null }; onOpen: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const isImage = (attachment.content_type ?? "").startsWith("image/") || /\.(png|jpe?g|gif|webp|heic)$/i.test(attachment.file_name);
  useEffect(() => {
    if (!isImage) return;
    let active = true;
    void supabase.storage.from("development-ticket-attachments").createSignedUrl(attachment.storage_path, 600).then(({ data }) => { if (active) setUrl(data?.signedUrl ?? null); });
    return () => { active = false; };
  }, [attachment.storage_path, isImage]);
  return <button type="button" title={attachment.file_name} aria-label={`Ampliar ${attachment.file_name}`} onClick={onOpen} className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted transition hover:ring-2 hover:ring-primary sm:h-20 sm:w-20">{isImage && url ? <img src={url} alt={attachment.file_name} className="h-full w-full object-cover" loading="lazy" /> : <Paperclip className="h-5 w-5 text-muted-foreground" />}</button>;
}
