import { NumericMarker } from "@/components/cde/numeric-markers";
import { DependencyEditor } from "@/components/central/dependency-editor";
import { ImageAttachmentField } from "@/components/image-attachment-field";
import { confirmAction } from "@/components/confirm-dialog";
import { CdeButton } from "@/components/cde/cde-button";
import { ColumnSortButton } from "@/components/column-sort-button";
import { CodeStatusBadge } from "@/components/code-status-badge";
import { matchesCodeTicketSearch } from "@/lib/code-ticket-search";
import { codeTicketProgressOutcome } from "@/lib/code-ticket-lifecycle";
import { isFilterActive, OP_LABELS, type FilterOp } from "@/lib/column-filters";
import { compareColumnValues, type SortDirection } from "@/lib/column-sort";
import { useTableFilters, type FilterColumn } from "@/components/use-table-filters";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CodeXml, Download, Eye, History, MessageCircleQuestion, MessageCircleMore, Paperclip, Send, Trash2, Pencil } from "lucide-react";
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
import { canReplyToCodeQuestion, shouldShowCodeAnswer } from "@/lib/code-conversation";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { filterCodeUsers } from "@/lib/code-user-search";
import { isCodeQuestionForUser, unansweredCodeQuestions } from "@/lib/code-pending";
import { codeQuestionResponders } from "@/lib/code-pending";
import { CdeDisclosureIcon } from "@/components/cde/cde-button";
import { CodeAppAttendants } from "@/components/code-app-attendants";
import { CodeTicketLifecycleActions } from "@/components/code-ticket-lifecycle-actions";
import { UsersRound, X, Save } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ButtonProps } from "@/components/ui/button";

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
  recipient_id: string | null;
  requester_seen_at: string | null;
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
  chamados: "OpDesk",
  mytosis: "Mytosis",
  cde: "CDE",
  wishlist: "Wishlist",
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
    const { data } = await supabase.rpc("code_can_open");
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
  const [usersOpen, setUsersOpen] = useState(false);
  const [searchOp, setSearchOp] = useState<FilterOp>("contains");
  const [searchText, setSearchText] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);


  const { data, isLoading } = useQuery({
    queryKey: ["development-tickets"],
    queryFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw authError ?? new Error("Sessão não encontrada");
      const userId = authData.user.id;
      const [{ data: tickets, error: ticketsError }, { data: admin }, { data: profiles }, { data: erpAdmins }, { data: codeAccesses }, messagesResult] = await Promise.all([
        supabase.from("development_tickets").select("*").order("created_at", { ascending: false }),
        supabase.from("erp_admins").select("user_id").eq("user_id", userId).maybeSingle(),
        supabase.rpc("code_conversation_users"),
        supabase.from("erp_admins").select("user_id"),
        supabase.from("user_app_access").select("user_id").eq("app_key", "development"),
        supabase.from("development_ticket_messages").select("id,ticket_id,author_id,message_type,parent_message_id,recipient_id,requester_seen_at"),
      ]);
      if (ticketsError) throw ticketsError;
      if (messagesResult.error) throw messagesResult.error;
      const codeAccessIds = new Set((codeAccesses ?? []).map((access) => access.user_id));
      const eligibleAdminIds = new Set((erpAdmins ?? []).map((entry) => entry.user_id).filter((id) => codeAccessIds.has(id)));
      const codeAdmins = (profiles ?? []).filter((profile) => eligibleAdminIds.has(profile.id));
      const questionResponders = new Map((tickets ?? []).map(ticket => [ticket.id, codeQuestionResponders(ticket.id, ticket.reporter_id, messagesResult.data ?? [])]));
      return { tickets: (tickets ?? []) as Ticket[], isAdmin: Boolean(admin) && codeAccessIds.has(userId), profiles: profiles ?? [], codeAdmins, userId, questionResponders, questionMessages: messagesResult.data ?? [] };
    },
  });

  const profileNames = useMemo(() => new Map((data?.profiles ?? []).map((profile) => [profile.id, profile.full_name || profile.email || "Usuário"])), [data?.profiles]);
  const ticketColumns: FilterColumn<Ticket>[] = [
    { key: "number", label: "Nº", kind: "number", value: (t) => t.ticket_number },
    { key: "reporter", label: "Solicitante", value: (t) => profileNames.get(t.reporter_id) ?? "Usuário" },
    { key: "app", label: "Aplicativo", value: (t) => APP_NAMES[t.app_key] ?? t.app_key },
    { key: "type", label: "Tipo", value: (t) => t.ticket_type === "bug" ? "Bug" : "Melhoria" },
    { key: "title", label: "Título", value: (t) => t.title },
    { key: "priority", label: "Prioridade", value: (t) => PRIORITY_NAMES[t.priority] },
    { key: "status", label: "Situação", value: (t) => STATUS_NAMES[t.status] },
    { key: "question", label: "Perguntas", value: (t) => [data?.questionResponders.get(t.id)?.requester ? "Pergunta aguardando Solicitante" : "", data?.questionResponders.get(t.id)?.attendant ? "Pergunta aguardando Responsável" : ""].filter(Boolean).join("; ") },
    { key: "date", label: "Data", kind: "date", value: (t) => t.created_at.slice(0, 10), display: (t) => new Date(t.created_at).toLocaleDateString("pt-BR") },
  ];
  const ticketFilters = useTableFilters(data?.tickets ?? [], ticketColumns);
  const [sorting, setSorting] = useState<{ key: string; direction: SortDirection }>();
  const sortColumn = ticketColumns.find((column) => column.key === sorting?.key);
  const sortedTickets = sortColumn && sorting ? [...ticketFilters.filtered].sort((a, b) => compareColumnValues(sortColumn.kind ?? "text", sortColumn.value(a), sortColumn.value(b), sorting.direction)) : ticketFilters.filtered;
  const [showDeleted, setShowDeleted] = useState(false);
  const matchingTickets = sortedTickets.filter(ticket => matchesCodeTicketSearch([
    ...ticketColumns.map(column => String(column.display?.(ticket) ?? column.value(ticket) ?? "")),
    ticket.description, ticket.expected_result, ticket.proposed_solution ?? "",
  ], { op: searchOp, value: searchText }));
  const filteredTickets = matchingTickets.filter(ticket => ticket.status !== "excluido");
  const deletedTickets = matchingTickets.filter(ticket => ticket.status === "excluido");
  const renderRow = (ticket: (typeof sortedTickets)[number]) => (
                  <TableRow key={ticket.id} className="md:h-12 cursor-pointer [&>td]:py-2" onClick={() => setSelectedTicket(ticket)}>
                    <TableCell className="font-semibold"><NumericMarker>{ticket.ticket_number}</NumericMarker></TableCell>
                     <TableCell>{profileNames.get(ticket.reporter_id) ?? "Usuário"}</TableCell>
                    <TableCell>{APP_NAMES[ticket.app_key] ?? ticket.app_key}</TableCell>
                    <TableCell><Badge variant="outline" className="font-normal">{ticket.ticket_type === "bug" ? "Bug" : "Melhoria"}</Badge></TableCell>
                    <TableCell className="md:max-w-[20rem] md:truncate font-medium">{ticket.title}</TableCell>
                    <TableCell>{PRIORITY_NAMES[ticket.priority]}</TableCell>
                    <TableCell><CodeStatusBadge status={ticket.status} label={STATUS_NAMES[ticket.status]} /></TableCell>
                    <TableCell>{unansweredCodeQuestions(data?.questionMessages ?? []).some(q => q.ticket_id === ticket.id) ? unansweredCodeQuestions(data?.questionMessages ?? []).some(q => q.ticket_id === ticket.id && isCodeQuestionForUser(q, ticket.reporter_id, data?.userId ?? "", Boolean(data?.isAdmin), ticket.assignee_id)) ? <span className="inline-flex shrink-0 text-destructive" title="Pergunta aguardando sua resposta" aria-label="Pergunta aguardando sua resposta"><MessageCircleQuestion className="h-5 w-5" /></span> : <span className="inline-flex shrink-0 text-muted-foreground" title="Aguardando resposta de outro usuário" aria-label="Aguardando resposta de outro usuário"><MessageCircleMore className="h-5 w-5" /></span> : <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell className="whitespace-nowrap">{new Date(ticket.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  </TableRow>
                 );
  const sortHeader = (key: string) => {
    const column = ticketColumns.find((entry) => entry.key === key);
    if (!column) return null;
    return <span className="inline-flex items-center gap-1 whitespace-nowrap">{column.label}<ColumnSortButton label={column.label} direction={sorting?.key === key ? sorting.direction : undefined} onClick={() => setSorting((current) => current?.key !== key ? { key, direction: "asc" } : current.direction === "asc" ? { key, direction: "desc" } : undefined)} /></span>;
  };
  useEffect(() => {
    const selectedId = routeSearch.ticket ?? selectedTicket?.id;
    if (!selectedId || !data?.tickets.length) return;
    const linkedTicket = data.tickets.find((ticket) => ticket.id === selectedId);
    if (linkedTicket) setSelectedTicket(linkedTicket);
  }, [data?.tickets, routeSearch.ticket, selectedTicket?.id]);

  const closeTicket = () => {
    setSelectedTicket(null);
    if (routeSearch.ticket) navigate({ to: "/development", search: { ticket: undefined }, replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader manualApp="Code" logo={<MyioAppLogo appName="Code" className="text-base sm:text-2xl" />} menuActions={data?.isAdmin ? [{ label: "Usuários", icon: <UsersRound className="h-5 w-5" />, onClick: () => setUsersOpen(true) }] : undefined} />
      {data?.isAdmin ? <CodeAppAttendants open={usersOpen} onOpenChange={setUsersOpen} admins={data.codeAdmins} appNames={APP_NAMES} /> : null}
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
            <div className="mb-3 flex flex-wrap items-center justify-end gap-2 text-[length:var(--filter-fs)]">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Select value={searchOp} onValueChange={value => setSearchOp(value as FilterOp)}><SelectTrigger aria-label="Condição da busca" className="h-8 w-36 text-[length:var(--filter-fs)]"><SelectValue /></SelectTrigger><SelectContent>{OP_LABELS.text.map(option => <SelectItem key={option.op} value={option.op}>{option.label}</SelectItem>)}</SelectContent></Select>
                {searchOp !== "empty" && searchOp !== "not_empty" ? <div className="relative w-56 max-w-full"><Input aria-label="Buscar tickets" placeholder="Buscar ticket" value={searchText} onChange={event => setSearchText(event.target.value)} className="h-8 pr-8 text-[length:var(--filter-fs)] md:text-[length:var(--filter-fs)]" />{searchText ? <Button type="button" variant="ghost" size="compactIcon" className="absolute right-0 top-1/2 -translate-y-1/2" aria-label="Limpar busca" title="Limpar busca" onClick={() => setSearchText("")}><X /></Button> : null}</div> : null}
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-[length:var(--filter-fs)] text-muted-foreground">Filtros{ticketFilters.menu}</span>
            </div>
            {ticketFilters.active > 0 ? <div className="mb-3 flex flex-wrap justify-end gap-2">{ticketColumns.filter(column => isFilterActive(ticketFilters.filters[column.key])).map(column => { const value = ticketFilters.filters[column.key]; return <Badge key={column.key} variant="secondary" className="max-w-full gap-1 font-normal"><span className="min-w-0 break-words">{column.label}: {value?.selected?.join(", ") || `${OP_LABELS[column.kind ?? "text"].find(option => option.op === value?.op)?.label ?? ""} ${value?.value ?? ""}${value?.value2 ? ` — ${value.value2}` : ""}`}</span><Button type="button" variant="ghost" size="compactIcon" aria-label={`Remover filtro ${column.label}`} title={`Remover filtro ${column.label}`} onClick={() => ticketFilters.setFilter(column.key, undefined)}><X /></Button></Badge>; })}</div> : null}
            {isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Carregando tickets...</p> : (
              <Table className="table-auto text-xs md:min-w-[1100px]">
                 <TableHeader>
                   <TableRow>
                     <TableHead className="w-[5%]">{sortHeader("number")}</TableHead>
                     <TableHead className="w-[13%]">{sortHeader("reporter")}</TableHead>
                     <TableHead className="w-[11%]">{sortHeader("app")}</TableHead>
                     <TableHead className="w-[8%]">{sortHeader("type")}</TableHead>
                     <TableHead className="w-[21%]">{sortHeader("title")}</TableHead>
                     <TableHead className="w-[10%]">{sortHeader("priority")}</TableHead>
                      <TableHead className="w-[15%]">{sortHeader("status")}</TableHead>
                     <TableHead className="w-[9%]">{sortHeader("question")}</TableHead>
                     <TableHead className="w-[8%]">{sortHeader("date")}</TableHead>
                   </TableRow>
                 </TableHeader>
                <TableBody>{filteredTickets.map(renderRow)}{!filteredTickets.length ? <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">Nenhum ticket encontrado.</TableCell></TableRow> : null}</TableBody>
              </Table>
            )}
            {deletedTickets.length ? <div className="mt-4 border-t pt-3"><Button type="button" variant="ghost" className="!h-auto !w-full !max-w-none !justify-between gap-2 !bg-transparent px-0 py-2 text-sm font-semibold" aria-expanded={showDeleted} onClick={() => setShowDeleted(v => !v)}><span className="min-w-0 break-words">Histórico de excluídos ({deletedTickets.length})</span><CdeDisclosureIcon open={showDeleted} screen="/development" direction="vertical" /></Button>{showDeleted ? <Table className="mt-2"><TableBody>{deletedTickets.map(renderRow)}</TableBody></Table> : null}</div> : null}
          </CardContent>
        </Card>
      </main>
      <TicketDetails ticket={selectedTicket} onClose={closeTicket} data={data} onUpdated={() => {
        queryClient.invalidateQueries({ queryKey: ["development-tickets"] });
        queryClient.invalidateQueries({ queryKey: ["my-erp-access"] });
        queryClient.invalidateQueries({ queryKey: ["pending-actions"] });
        queryClient.invalidateQueries({ queryKey: ["central-admin"] });
      }} />
    </div>
  );
}

function FilterSelect({ value, onChange, placeholder, options, firstOption = { value: "todos", label: "Todos" } }: { value: string; onChange: (value: string) => void; placeholder: string; options: { value: string; label: string }[]; firstOption?: { value: string; label: string } | null }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{firstOption ? <SelectItem value={firstOption.value}>{firstOption.label}</SelectItem> : null}{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>;
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
    <DialogTrigger asChild><CdeButton group="plus" screen="routes/_authenticated/development.tsx">Novo ticket</CdeButton></DialogTrigger>
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
           <div className="sm:col-span-2"><Label htmlFor="ticket-file">Prints e fotos (até 10 MB por imagem)</Label><ImageAttachmentField key={fileInputKey} id="ticket-file" files={files} onChange={setFiles} /></div>
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

function CodeSaveButton({ label, ...props }: Omit<ButtonProps, "children"> & { label: string }) {
  return <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><span className="inline-flex"><Button {...props} variant="ghost" size="compactIcon" aria-label={label} title={label}><Save /></Button></span></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip></TooltipProvider>;
}

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
  const [recipientId, setRecipientId] = useState("");
  const [reporterMode, setReporterMode] = useState<"question" | "answer">("answer");
   const [messageFiles, setMessageFiles] = useState<File[]>([]);
   const [messageFileInputKey, setMessageFileInputKey] = useState(0);
  const [preview, setPreview] = useState<{ url: string; downloadUrl: string; name: string; contentType: string } | null>(null);
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
     setRecipientId(ticket.reporter_id === data?.userId ? ticket.assignee_id ?? "" : ticket.reporter_id);
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
  useEffect(() => {
    if (!ticket || ticket.reporter_id !== data?.userId || !details.data?.messages.some(m => m.recipient_id && m.recipient_id !== data.userId && m.author_id !== data.userId && !m.requester_seen_at)) return;
    void supabase.rpc("mark_code_question_alerts_read", { _ticket_id: ticket.id }).then(({ error }) => { if (!error) onUpdated(); });
  }, [ticket?.id, data?.userId, details.data?.messages]);
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
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const editTitle = useMutation({
    mutationFn: async () => {
      if (!ticket || !editingTitle || editingTitle.trim().length < 3) throw new Error("O título deve ter ao menos 3 caracteres");
      const { error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ error: Error | null }>)("edit_code_ticket_title", { _ticket_id: ticket.id, _title: editingTitle.trim() });
      if (error) throw error;
    },
    onSuccess: async () => { toast.success("Título atualizado"); setEditingTitle(null); await details.refetch(); onUpdated(); },
    onError: (error: Error) => toast.error(error.message),
  });
  const deleteAttachment = useMutation({
    mutationFn: async (attachment: { id: string; storage_path: string }) => {
      const { error } = await supabase.from("development_ticket_attachments").delete().eq("id", attachment.id);
      if (error) throw error;
      await supabase.storage.from("development-ticket-attachments").remove([attachment.storage_path]);
    },
    onSuccess: async () => { toast.success("Anexo excluído"); await details.refetch(); },
    onError: (error: Error) => toast.error(error.message),
  });
  const conversationQuestions = messages.filter((entry) => entry.message_type === "question");
  const questionNumber = new Map(conversationQuestions.map((entry, index) => [entry.id, index + 1]));
  const orderedMessages = [...conversationQuestions.flatMap((question) => [question, ...messages.filter((entry) => entry.message_type === "answer" && entry.parent_message_id === question.id)]), ...messages.filter((entry) => entry.message_type === "answer" && !questionNumber.has(entry.parent_message_id ?? ""))];
  const answeredQuestionIds = new Set(messages.filter((entry) => entry.message_type === "answer" && entry.parent_message_id).map((entry) => entry.parent_message_id));
  const pendingQuestions = messages.filter((entry) => entry.message_type === "question" && isCodeQuestionForUser(entry, ticket?.reporter_id ?? "", data?.userId ?? "", Boolean(data?.isAdmin), ticket?.assignee_id) && !answeredQuestionIds.has(entry.id));
  const canAsk = Boolean(data?.isAdmin && ticket && !["atendido", "concluido", "excluido"].includes(ticket.status));
  const isReporter = Boolean(ticket && ticket.reporter_id === data?.userId && !["concluido", "excluido"].includes(ticket.status));
  const canReply = canReplyToCodeQuestion(ticket?.status, Boolean(data?.isAdmin), isReporter || pendingQuestions.length > 0, pendingQuestions.length);
  const canAnswer = shouldShowCodeAnswer(canReply, reporterMode, canAsk || isReporter);
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
        recipient_id: shouldAnswer ? null : recipientId || null,
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
      toast.success(result === "attachments" ? "Imagens anexadas" : shouldAnswer ? "Resposta enviada" : canAskReporter ? "Pergunta enviada" : "Pergunta enviada");
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
      if (!ticket) throw new Error("Chamado não encontrado. Atualize e tente novamente.");
      validateImages(messageFiles);
      const { data: saved, error } = await supabase.from("development_tickets").update({ status, assignee_id: assignee === "none" ? null : assignee, admin_notes: notes.trim() || null, proposed_solution: proposedSolutionSchema.parse(solution) || null }).eq("id", ticket.id).select("id,status").single();
      if (error) throw error;
      const outcome = codeTicketProgressOutcome(status, saved);
      await flushPendingImages();
      return outcome;
    },
    onSuccess: (outcome) => {
      onUpdated();
      if (outcome === "pending_requester_question") {
        setStatus("em_atendimento");
        toast.warning("O chamado permanece Em atendimento porque há pergunta do Solicitante sem resposta. Responda antes de marcar como Atendido.");
        void details.refetch();
        return;
      }
      toast.success("Ticket atualizado");
      onClose();
    },
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
  async function openPreview(path: string, name: string, contentType: string | null) {
    const storage = supabase.storage.from("development-ticket-attachments");
    const [viewResult, downloadResult] = await Promise.all([
      storage.createSignedUrl(path, 300),
      storage.createSignedUrl(path, 300, { download: name }),
    ]);
    const error = viewResult.error ?? downloadResult.error;
    if (error) return toast.error(error.message);
    if (!viewResult.data || !downloadResult.data) return toast.error("Não foi possível preparar o anexo. Tente novamente.");
    setPreview({ url: viewResult.data.signedUrl, downloadUrl: downloadResult.data.signedUrl, name, contentType: contentType ?? "application/octet-stream" });
  }
  return <>
    <Dialog open={Boolean(ticket)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {ticket ? <div className="space-y-5">
        <DialogHeader><DialogTitle className="flex items-center gap-1">{editingTitle !== null ? <span className="flex flex-1 items-center gap-2"><span><NumericMarker>{ticket.ticket_number}</NumericMarker> —</span><Input value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} minLength={3} maxLength={120} className="h-8 flex-1" autoFocus /><Button variant="outline" size="sm" onClick={() => setEditingTitle(null)}>Cancelar</Button><CodeSaveButton label="Salvar" onClick={() => editTitle.mutate()} disabled={editTitle.isPending || editingTitle.trim().length < 3} /></span> : <><NumericMarker>{ticket.ticket_number}</NumericMarker> — {ticket.title}{isReporter && <Button variant="ghost" size="compactIcon" title="Editar título" aria-label="Editar título" onClick={() => setEditingTitle(ticket.title)}><Pencil className="h-3.5 w-3.5" /></Button>}</>}</DialogTitle><DialogDescription>{APP_NAMES[ticket.app_key]} · {ticket.ticket_type === "bug" ? "Bug" : "Melhoria"} · Solicitante: {data?.profiles.find((profile) => profile.id === ticket.reporter_id)?.full_name || data?.profiles.find((profile) => profile.id === ticket.reporter_id)?.email || "Usuário"} · {new Date(ticket.created_at).toLocaleString("pt-BR")}</DialogDescription></DialogHeader>
        <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Dependências</span><DependencyEditor kind="code" sourceId={ticket.id} /></div>
        {ticket.menu_name || ticket.submenu_name ? <div className="flex flex-wrap gap-2">{ticket.menu_name ? <Badge variant="outline">Menu: {ticket.menu_name}</Badge> : null}{ticket.submenu_name ? <Badge variant="outline">Submenu: {ticket.submenu_name}</Badge> : null}</div> : null}
        <div className="grid gap-4 sm:grid-cols-2"><div><p className="text-xs font-semibold text-muted-foreground">Descrição</p><p className="mt-1 whitespace-pre-wrap text-sm">{ticket.description}</p></div><div><p className="text-xs font-semibold text-muted-foreground">Resultado esperado</p><p className="mt-1 whitespace-pre-wrap text-sm">{ticket.expected_result}</p></div></div>
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2"><CodeStatusBadge status={ticket.status} label={STATUS_NAMES[ticket.status]} /><Badge variant="outline">Prioridade {PRIORITY_NAMES[ticket.priority]}</Badge>{ticket.urgency === "urgente" ? <Badge variant="destructive">Urgente</Badge> : null}</div><CodeTicketLifecycleActions ticket={ticket} userId={data?.userId} isCodeAdmin={Boolean(data?.isAdmin)} onChanged={() => { void details.refetch(); onUpdated(); }} onConcluded={onClose} /></div>
         {details.data?.attachments.some((attachment) => !attachment.message_id) ? <div><p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Paperclip className="h-4 w-4" />Anexos do chamado</p><div className="flex flex-wrap gap-2">{details.data.attachments.filter((attachment) => !attachment.message_id).map((attachment) => <TicketAttachmentThumb key={attachment.id} attachment={attachment} onOpen={() => openPreview(attachment.storage_path, attachment.file_name, attachment.content_type)} onDelete={canAttach ? async () => { if (await confirmAction(`Excluir o anexo "${attachment.file_name}"?`)) deleteAttachment.mutate(attachment); } : undefined} />)}</div></div> : null}
        <section className="space-y-2 border-t pt-4"><div className="flex items-center justify-between gap-2"><Label htmlFor="ticket-solution">Solução Proposta <span className="text-muted-foreground">(opcional)</span></Label>{canRecord && !editingSolution ? <Button type="button" variant="ghost" size="compactIcon" title="Editar Solução Proposta" aria-label="Editar Solução Proposta" onClick={() => setEditingSolution(true)}><Pencil className="h-3.5 w-3.5" /></Button> : null}</div><Textarea id="ticket-solution" value={solution} onChange={(event) => setSolution(event.target.value)} maxLength={4000} readOnly={!canRecord || !editingSolution} className={`min-h-24 ${!canRecord || !editingSolution ? "bg-muted/40 cursor-default" : ""}`} />{canRecord && editingSolution && <div className="flex justify-end gap-2">{ticket.proposed_solution?.trim() ? <Button variant="outline" onClick={() => { setSolution(ticket.proposed_solution ?? ""); setEditingSolution(false); }}>Cancelar</Button> : null}<CodeSaveButton label="Salvar solução" onClick={() => saveSolution.mutate()} disabled={saveSolution.isPending} /></div>}</section>
         {messages.length || canAttach ? <div className="space-y-3 border-t pt-4"><p className="flex items-center gap-2 text-sm font-semibold"><MessageCircleQuestion className="h-4 w-4" />Conversa</p>{messages.length ? <div className="space-y-2">{orderedMessages.map((entry) => <div key={entry.id} className={`rounded-md border p-3 text-sm ${entry.message_type === "question" ? "border-border bg-card" : "ml-6 border-primary/40 bg-primary/10"}`}><div className="mb-1 flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">{`${entry.message_type === "question" ? "Pergunta" : "Resposta"} ${questionNumber.get(entry.message_type === "question" ? entry.id : entry.parent_message_id ?? "") ?? ""} · `}{personName(entry.author_id)}</span><span className="flex items-center gap-1 text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString("pt-BR")}{entry.author_id === data?.userId && canAttach && editingMessageId !== entry.id ? <Button type="button" variant="ghost" size="compactIcon" title={entry.message_type === "question" ? "Editar pergunta" : "Editar resposta"} aria-label={entry.message_type === "question" ? "Editar pergunta" : "Editar resposta"} onClick={() => { setEditingMessageId(entry.id); setEditingMessageText(entry.message); }}><Pencil className="h-3.5 w-3.5" /></Button> : null}</span></div>{editingMessageId === entry.id ? <div className="space-y-2"><Textarea value={editingMessageText} onChange={(event) => setEditingMessageText(event.target.value)} maxLength={4000} className="min-h-24 bg-background" /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { setEditingMessageId(null); setEditingMessageText(""); }}>Cancelar</Button><CodeSaveButton label="Salvar" onClick={() => editMessage.mutate()} disabled={editMessage.isPending || !editingMessageText.trim()} /></div></div> : <div>{entry.message_type === "question" && entry.recipient_id && <p className="mb-1 text-xs text-muted-foreground">Para: {personName(entry.recipient_id)}</p>}<p className="whitespace-pre-wrap">{entry.message}</p></div>}{details.data?.attachments.some((attachment) => attachment.message_id === entry.id) ? <div className="mt-2 flex flex-wrap gap-2">{details.data.attachments.filter((attachment) => attachment.message_id === entry.id).map((attachment) => <TicketAttachmentThumb key={attachment.id} attachment={attachment} onOpen={() => openPreview(attachment.storage_path, attachment.file_name, attachment.content_type)} onDelete={canAttach ? async () => { if (await confirmAction(`Excluir o anexo "${attachment.file_name}"?`)) deleteAttachment.mutate(attachment); } : undefined} />)}</div> : null}{entry.message_type === "question" && !answeredQuestionIds.has(entry.id) ? <Badge variant="destructive" className="mt-2">Aguardando resposta</Badge> : null}</div>)}</div> : <p className="text-sm text-muted-foreground">Nenhuma mensagem registrada.</p>}{canAttach || canReply ? <div>{canReply && (canAsk || canAskReporter) ? <div className="mb-3 flex gap-2"><Button size="sm" variant="ghost" actionKind="standard" aria-pressed={reporterMode === "answer"} className={reporterMode === "answer" ? "underline underline-offset-4" : undefined} onClick={() => setReporterMode("answer")}>Responder</Button><Button size="sm" variant="ghost" actionKind="standard" aria-pressed={reporterMode === "question"} className={reporterMode === "question" ? "underline underline-offset-4" : undefined} onClick={() => setReporterMode("question")}>Nova pergunta</Button></div> : null}{canAnswer && pendingQuestions.length > 1 ? <div className="mb-3"><Label htmlFor="ticket-reply-to">Responder à pergunta</Label><Select value={pendingQuestions.some((entry) => entry.id === replyToId) ? replyToId : pendingQuestions[0].id} onValueChange={setReplyToId}><SelectTrigger id="ticket-reply-to" className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{pendingQuestions.map((entry, index) => <SelectItem key={entry.id} value={entry.id}>{`Pergunta ${questionNumber.get(entry.id) ?? index + 1}: ${entry.message.slice(0, 70)}`}</SelectItem>)}</SelectContent></Select></div> : null}{shouldAnswer || canAskReporter || canAsk ? <>{!shouldAnswer && <div className="mb-3 space-y-1"><Label>Destinatário</Label><SearchableSelect aria-label="Destinatário da pergunta" value={recipientId} onChange={setRecipientId} options={(data?.profiles ?? []).filter(p => p.id !== data?.userId).map(p => ({ value: p.id, label: p.full_name || p.email || "Usuário", hint: p.email ?? undefined, keywords: p.id === ticket.reporter_id ? "Solicitante" : undefined }))} optionFilter={filterCodeUsers} clearable={false} placeholder="Buscar usuário" /></div>}<Label htmlFor="ticket-message">{shouldAnswer ? "Responder à pergunta" : canAskReporter ? "Nova pergunta" : "Pergunta"}</Label><div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end"><Textarea id="ticket-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} className="min-h-24 flex-1" onKeyDown={(event) => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !sendMessage.isPending && message.trim()) { event.preventDefault(); sendMessage.mutate(); } }} placeholder={shouldAnswer ? "Digite sua resposta" : canAskReporter ? "Digite sua nova pergunta" : "Digite a dúvida que precisa ser esclarecida"} /><Button className="shrink-0" variant={!message.trim() ? "ghost" : undefined} size={!message.trim() ? "compactIcon" : undefined} title={!message.trim() ? "Salvar" : undefined} aria-label={!message.trim() ? "Salvar" : undefined} onClick={() => sendMessage.mutate()} disabled={sendMessage.isPending || (!message.trim() && !messageFiles.length) || (!shouldAnswer && Boolean(message.trim()) && !recipientId && !canAskReporter)}>{message.trim() ? <Send className="h-4 w-4" /> : null}{!message.trim() ? <Save className="h-4 w-4" /> : sendMessage.isPending ? "Enviando..." : shouldAnswer ? "Enviar resposta" : "Enviar pergunta"}</Button></div><p className="mt-1 text-xs text-muted-foreground">Ctrl+Enter (⌘+Enter no Mac) também envia.</p></> : null}{canAttach && <><Label htmlFor="ticket-message-images" className="mt-3 block">Prints e fotos (até 10 MB por imagem)</Label><ImageAttachmentField key={messageFileInputKey} id="ticket-message-images" files={messageFiles} onChange={setMessageFiles} /></>}{messageFiles.length ? <p className="mt-1 text-xs text-muted-foreground">{messageFiles.length === 1 ? "1 imagem selecionada" : `${messageFiles.length} imagens selecionadas`} — será anexada ao salvar ou enviar a mensagem.</p> : null}{shouldAnswer || canAskReporter || canAsk ? null : <div className="mt-2 flex justify-end"><Button variant={!message.trim() ? "ghost" : undefined} size={!message.trim() ? "compactIcon" : undefined} title={!message.trim() ? "Salvar" : undefined} aria-label={!message.trim() ? "Salvar" : undefined} onClick={() => sendMessage.mutate()} disabled={sendMessage.isPending || (!message.trim() && !messageFiles.length) || (!shouldAnswer && Boolean(message.trim()) && !recipientId && !canAskReporter)}>{message.trim() ? <Send className="h-4 w-4" /> : null}{!message.trim() ? <Save className="h-4 w-4" /> : sendMessage.isPending ? "Enviando..." : shouldAnswer ? "Enviar resposta" : "Enviar pergunta"}</Button></div>}</div> : null}</div> : null}
        {data?.isAdmin && ticket.status !== "concluido" && ticket.status !== "excluido" ? <div className="space-y-3 border-t pt-4"><h3 className="font-semibold">Gestão do ticket</h3><div className="grid gap-3 sm:grid-cols-2"><div><Label>Situação</Label><FilterSelect value={status} onChange={(value) => setStatus(value as TicketStatus)} placeholder="Situação" options={Object.entries(ADMIN_STATUS_NAMES).map(([value, label]) => ({ value, label }))} firstOption={null} /></div><div><Label>Responsável pela execução</Label><FilterSelect value={assignee} onChange={setAssignee} placeholder="Responsável pela execução" options={(data.codeAdmins ?? []).map((profile) => ({ value: profile.id, label: profile.full_name || profile.email || "Usuário" }))} firstOption={{ value: "none", label: "Sem responsável" }} /></div></div><div className="flex justify-end"><CodeSaveButton label="Salvar andamento" onClick={() => update.mutate()} disabled={update.isPending} /></div></div> : null}
        {ticket.status === "aberto" && ticket.reporter_id === data?.userId ? <div className="flex justify-end border-t pt-4"><AlertDialog><AlertDialogTrigger asChild><Button variant="destructive"><Trash2 className="h-4 w-4" />Excluir ticket</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir este ticket?</AlertDialogTitle><AlertDialogDescription>Ele permanecerá no histórico com a situação “Excluído” e deixará de ser uma pendência para o executor.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate()} disabled={remove.isPending}>{remove.isPending ? "Excluindo..." : "Confirmar exclusão"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div> : null}
        <section className="space-y-3 border-t pt-4"><h3 className="text-sm font-semibold">Observações</h3>
          {ticket.admin_notes && !observations.some((entry) => entry.observation_id === ticket.id) && <div className="space-y-2"><div className="flex items-center justify-between"><Label>Observação anterior</Label><div className="flex items-center gap-1">{canRecord && <Button variant="ghost" size="compactIcon" title="Editar observação anterior" aria-label="Editar observação anterior" onClick={() => { setEditingObservation(ticket.id); setObservation(ticket.admin_notes ?? ""); }}><Pencil className="h-3.5 w-3.5" /></Button>}{canRecord && <Button variant="ghost" size="compactIcon" title="Excluir observação" aria-label="Excluir observação" onClick={() => setDeletingObservation(ticket.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}</div></div><p className="whitespace-pre-wrap text-sm">{ticket.admin_notes}</p></div>}
          {observations.map((entry) => <div key={entry.observation_id} className="border-b border-border pb-3"><div className="flex items-start justify-between gap-2"><p className="whitespace-pre-wrap break-words text-sm">{entry.note}</p><div className="flex shrink-0 items-center gap-1">{canRecord && <Button variant="ghost" size="compactIcon" aria-label="Editar observação" title="Editar observação" onClick={() => { setEditingObservation(entry.observation_id); setObservation(entry.note ?? ""); }}><Pencil className="h-3.5 w-3.5" /></Button>}{canRecord && <Button variant="ghost" size="compactIcon" aria-label="Excluir observação" title="Excluir observação" onClick={() => setDeletingObservation(entry.observation_id)}><Trash2 className="h-3.5 w-3.5" /></Button>}</div></div><p className="mt-1 text-xs text-muted-foreground">{data?.profiles.find((profile) => profile.id === entry.changed_by)?.full_name ?? "Usuário"} · {new Date(entry.created_at).toLocaleString("pt-BR")}</p></div>)}
          {canRecord && <div className="space-y-2"><Label htmlFor="ticket-observation">{editingObservation ? "Editar observação" : "Nova observação"}</Label><Textarea id="ticket-observation" value={observation} onChange={(event) => setObservation(event.target.value)} maxLength={4000} /><div className="flex justify-end gap-2">{editingObservation && <Button variant="outline" onClick={() => { setEditingObservation(null); setObservation(""); }}>Cancelar</Button>}<CodeSaveButton label="Salvar" onClick={() => saveObservation.mutate()} disabled={saveObservation.isPending || !observation.trim()} /></div></div>}
        </section>
        <AlertDialog open={!!deletingObservation} onOpenChange={(open) => { if (!open) setDeletingObservation(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir esta observação?</AlertDialogTitle><AlertDialogDescription>A observação sai da lista e a exclusão fica registrada no Histórico.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); if (deletingObservation) deleteObservation.mutate(deletingObservation); }} disabled={deleteObservation.isPending}>{deleteObservation.isPending ? "Excluindo..." : "Excluir"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        <div className="border-t pt-4"><p className="mb-2 flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" />Histórico</p><MilestoneTimeline entries={[{ id: `opened-${ticket.id}`, created_at: ticket.created_at, text: `Ticket aberto por ${personName(ticket.reporter_id)} (Solicitante)` }, ...(details.data?.logs ?? []).filter((log) => log.event_type || log.previous_status !== log.new_status || log.previous_assignee_id !== log.new_assignee_id || log.note).map((log) => ({ id: log.id, created_at: log.created_at, text: (log.event_type === "ticket_reopened" ? `Chamado reaberto: Concluído → Em atendimento\nMotivo: ${log.note ?? "—"}` : log.event_type === "observation_added" ? `Observação adicionada: ${log.note ?? ""}` : log.event_type === "observation_deleted" ? `Observação excluída: ${log.previous_note ?? ""}` : log.event_type === "observation_edited" ? `Observação alterada\nAntes: ${log.previous_note ?? ""}\nDepois: ${log.note ?? ""}` : log.event_type === "title_edited" ? `Título alterado\nAntes: ${log.previous_note ?? ""}\nDepois: ${log.note ?? ""}` : log.event_type === "question_edited" || log.event_type === "answer_edited" ? `${log.event_type === "question_edited" ? "Pergunta alterada" : "Resposta alterada"}\nAntes: ${log.previous_note ?? ""}\nDepois: ${log.note ?? ""}` : log.event_type === "solution_updated" ? (log.previous_note?.trim() ? `Solução Proposta alterada\nAntes: ${log.previous_note}\nDepois: ${log.note ?? "—"}` : `Solução Proposta registrada: ${log.note ?? ""}`) : log.previous_status !== log.new_status ? `${STATUS_NAMES[log.previous_status as TicketStatus] ?? "—"} → ${STATUS_NAMES[log.new_status as TicketStatus] ?? "—"}` : log.note ? `Responsável ou observação atualizados: ${log.note}` : `Responsável atualizado: ${log.new_assignee_id ? personName(log.new_assignee_id) : "—"}`) + (log.previous_assignee_id !== log.new_assignee_id && log.new_assignee_id && (log.event_type || log.previous_status !== log.new_status || log.note) ? `\nResponsável: ${personName(log.new_assignee_id)}` : "") + `\npor ${personName(log.changed_by)}` })), ...messages.map((entry) => ({ id: entry.id, created_at: entry.created_at, text: (entry.message_type === "question" ? entry.author_id === ticket.reporter_id ? "Pergunta enviada pelo Solicitante" : "Pergunta enviada pelo Admin" : entry.author_id === ticket.reporter_id ? "Resposta enviada pelo Solicitante" : "Resposta enviada pelo Atendente") + `: ${entry.message}\npor ${personName(entry.author_id)}` }))]} /></div>
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
          {preview ? <Button asChild><a href={preview.downloadUrl} download={preview.name}><Download className="h-4 w-4" />Baixar anexo</a></Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

function TicketAttachmentThumb({ attachment, onOpen, onDelete }: { attachment: { storage_path: string; file_name: string; content_type: string | null }; onOpen: () => void; onDelete?: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const isImage = (attachment.content_type ?? "").startsWith("image/") || /\.(png|jpe?g|gif|webp|heic)$/i.test(attachment.file_name);
  useEffect(() => {
    if (!isImage) return;
    let active = true;
    void supabase.storage.from("development-ticket-attachments").createSignedUrl(attachment.storage_path, 600).then(({ data }) => { if (active) setUrl(data?.signedUrl ?? null); });
    return () => { active = false; };
  }, [attachment.storage_path, isImage]);
  return <div className="relative">{onDelete ? <button type="button" title="Excluir anexo" aria-label={`Excluir ${attachment.file_name}`} onClick={onDelete} className="absolute -right-1.5 -top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-background text-primary shadow-sm hover:bg-primary hover:text-primary-foreground"><Trash2 className="h-3.5 w-3.5" /></button> : null}<button type="button" title={attachment.file_name} aria-label={`Ampliar ${attachment.file_name}`} onClick={onOpen} className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted transition hover:ring-2 hover:ring-primary sm:h-20 sm:w-20">{isImage && url ? <img src={url} alt={attachment.file_name} className="h-full w-full object-cover" loading="lazy" /> : <Paperclip className="h-5 w-5 text-muted-foreground" />}</button></div>;
}
