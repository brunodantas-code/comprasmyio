import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { History, Home, MessageCircle, Paperclip, Phone, Plus, Send } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { MyioAppLogo } from "@/components/myio-app-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type CallStatus = "aberto" | "em_atendimento" | "aguardando" | "resolvido" | "cancelado";
type CallPriority = "baixa" | "media" | "alta" | "critica";
type CallCategory = "problema_campo" | "reclamacao_cliente" | "outros";
type InternalCall = { id: string; call_number: string; category: CallCategory; title: string; description: string; priority: CallPriority; status: CallStatus; reporter_id: string; assignee_id: string | null; internal_notes: string | null; source: "manual" | "site_survey"; site_survey_visit_id: string | null; created_at: string };
type Profile = { id: string; full_name: string | null; email: string | null };

const CATEGORIES: Record<CallCategory, string> = { problema_campo: "Problema em campo", reclamacao_cliente: "Reclamação de cliente", outros: "Outros assuntos internos" };
const PRIORITIES: Record<CallPriority, string> = { baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica" };
const STATUSES: Record<CallStatus, string> = { aberto: "Aberto", em_atendimento: "Em atendimento", aguardando: "Aguardando", resolvido: "Resolvido", cancelado: "Cancelado" };

export const Route = createFileRoute("/_authenticated/chamados")({
  validateSearch: (search: Record<string, unknown>) => ({ chamado: typeof search.chamado === "string" ? search.chamado : undefined }),
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_app_access").select("app_key").eq("user_id", context.user.id).eq("app_key", "chamados").maybeSingle();
    if (!data) throw redirect({ to: "/portal" });
  },
  component: CallsPage,
  head: () => ({ meta: [
    { title: "Chamados | myio ERP" },
    { name: "description", content: "Abertura e acompanhamento de chamados internos." },
    { property: "og:title", content: "Chamados | myio ERP" },
    { property: "og:description", content: "Abertura e acompanhamento de chamados internos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function CallsPage() {
  const qc = useQueryClient();
  const routeSearch = Route.useSearch();
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<InternalCall | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("todos");
  const [status, setStatus] = useState("todos");
  const { data, isLoading } = useQuery({
    queryKey: ["internal-calls"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão não encontrada");
      const [{ data: calls, error }, { data: profiles }, { data: admin }, { data: admins }, { data: accesses }] = await Promise.all([
        supabase.from("internal_calls").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id,full_name,email").is("deleted_at", null).order("full_name"),
        supabase.from("erp_admins").select("user_id").eq("user_id", auth.user.id).maybeSingle(),
        supabase.from("erp_admins").select("user_id"),
        supabase.from("user_app_access").select("user_id").eq("app_key", "chamados"),
      ]);
      if (error) throw error;
      const accessIds = new Set((accesses ?? []).map((item) => item.user_id));
      const adminIds = new Set((admins ?? []).map((item) => item.user_id));
      return { calls: (calls ?? []) as InternalCall[], profiles: (profiles ?? []) as Profile[], userId: auth.user.id, isAdmin: Boolean(admin), responsible: (profiles ?? []).filter((profile) => accessIds.has(profile.id) && adminIds.has(profile.id)) as Profile[] };
    },
  });
  const names = useMemo(() => new Map((data?.profiles ?? []).map((profile) => [profile.id, profile.full_name || profile.email || "Usuário"])), [data?.profiles]);
  const filtered = (data?.calls ?? []).filter((call) => (!search.trim() || `${call.call_number} ${call.title}`.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR"))) && (category === "todos" || call.category === category) && (status === "todos" || call.status === status));
  useEffect(() => { const call = data?.calls.find((item) => item.id === routeSearch.chamado); if (call) setSelected(call); }, [data?.calls, routeSearch.chamado]);
  const refresh = () => qc.invalidateQueries({ queryKey: ["internal-calls"] });
  return <div className="min-h-screen bg-background">
    <header className="border-b bg-card"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"><Link to="/portal"><MyioAppLogo appName="Chamados" className="text-base sm:text-2xl" /></Link><Button asChild variant="outline" size="icon"><Link to="/portal" aria-label="Início"><Home className="h-4 w-4" /></Link></Button></div></header>
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex items-end justify-between gap-4"><div><h1 className="flex items-center gap-2 text-3xl font-extrabold"><Phone className="h-8 w-8" />Chamados</h1><p className="mt-1 text-muted-foreground">Problemas em campo, reclamações e assuntos internos.</p></div><NewCallDialog open={newOpen} onOpenChange={setNewOpen} userId={data?.userId} onCreated={refresh} /></div>
      <Card><CardHeader><CardTitle>Acompanhamento</CardTitle><CardDescription>{data?.isAdmin ? "Chamados internos da plataforma." : "Chamados abertos por você ou atribuídos a você."}</CardDescription></CardHeader><CardContent>
        <div className="mb-4 grid gap-2 sm:grid-cols-3"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por número ou título" /><Filter value={category} onChange={setCategory} options={CATEGORIES} /><Filter value={status} onChange={setStatus} options={STATUSES} /></div>
        {isLoading ? <p className="py-8 text-center text-muted-foreground">Carregando chamados...</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-primary/20"><TableHead>Nº</TableHead><TableHead>Solicitante</TableHead><TableHead>Categoria</TableHead><TableHead>Título</TableHead><TableHead>Prioridade</TableHead><TableHead>Situação</TableHead><TableHead>Data</TableHead></TableRow></TableHeader><TableBody>{filtered.map((call) => <TableRow key={call.id} className="cursor-pointer" onClick={() => setSelected(call)}><TableCell className="font-semibold">#{call.call_number}</TableCell><TableCell>{names.get(call.reporter_id)}</TableCell><TableCell>{CATEGORIES[call.category]}</TableCell><TableCell className="max-w-xs truncate font-medium">{call.title}</TableCell><TableCell>{PRIORITIES[call.priority]}</TableCell><TableCell><Badge variant="status">{STATUSES[call.status]}</Badge></TableCell><TableCell>{new Date(call.created_at).toLocaleDateString("pt-BR")}</TableCell></TableRow>)}{!filtered.length ? <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Nenhum chamado encontrado.</TableCell></TableRow> : null}</TableBody></Table></div>}
      </CardContent></Card>
    </main>
    <CallDetails call={selected} data={data} names={names} onClose={() => setSelected(null)} onUpdated={refresh} />
  </div>;
}

function Filter({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: Record<string, string> }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem>{Object.entries(options).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select>;
}

function NewCallDialog({ open, onOpenChange, userId, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; userId?: string; onCreated: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const create = useMutation({ mutationFn: async (form: HTMLFormElement) => {
    if (!userId) throw new Error("Sessão não encontrada");
    const values = new FormData(form);
    const { data: call, error } = await supabase.from("internal_calls").insert({ reporter_id: userId, category: String(values.get("category")) as CallCategory, title: String(values.get("title")).trim(), description: String(values.get("description")).trim(), priority: String(values.get("priority")) as CallPriority }).select("id").single();
    if (error) throw error;
    if (file) { const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-"); const path = `${userId}/${call.id}/${crypto.randomUUID()}-${safe}`; const { error: uploadError } = await supabase.storage.from("internal-call-attachments").upload(path, file); if (uploadError) throw uploadError; const { error: attachmentError } = await supabase.from("internal_call_attachments").insert({ call_id: call.id, uploaded_by: userId, file_name: file.name, storage_path: path, content_type: file.type || "application/octet-stream", file_size: file.size }); if (attachmentError) throw attachmentError; }
  }, onSuccess: () => { toast.success("Chamado aberto com sucesso"); setFile(null); onOpenChange(false); onCreated(); }, onError: (error: Error) => toast.error(error.message) });
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogTrigger asChild><Button size="icon" className="rounded-full" title="Adicionar chamado"><Plus className="h-5 w-5" /></Button></DialogTrigger><DialogContent className="max-w-2xl"><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); create.mutate(event.currentTarget); }}><DialogHeader><DialogTitle>Novo chamado</DialogTitle><DialogDescription>Registre um assunto interno para acompanhamento.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><FormSelect name="category" label="Categoria" options={CATEGORIES} /><FormSelect name="priority" label="Prioridade" options={PRIORITIES} /><div className="sm:col-span-2"><Label htmlFor="call-title">Título</Label><Input id="call-title" name="title" minLength={3} maxLength={120} required /></div><div className="sm:col-span-2"><Label htmlFor="call-description">Descrição</Label><Textarea id="call-description" name="description" minLength={5} maxLength={4000} className="min-h-28" required /></div><div className="sm:col-span-2"><Label htmlFor="call-file">Anexo opcional (até 10 MB)</Label><Input id="call-file" type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></div></div><DialogFooter><Button type="submit" disabled={create.isPending}>{create.isPending ? "Abrindo..." : "Abrir chamado"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function FormSelect({ name, label, options }: { name: string; label: string; options: Record<string, string> }) { return <div><Label>{label}</Label><Select name={name} required><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{Object.entries(options).map(([key, text]) => <SelectItem key={key} value={key}>{text}</SelectItem>)}</SelectContent></Select></div>; }

function CallDetails({ call, data, names, onClose, onUpdated }: { call: InternalCall | null; data?: { userId: string; isAdmin: boolean; profiles: Profile[]; responsible: Profile[] }; names: Map<string, string>; onClose: () => void; onUpdated: () => void }) {
  const [status, setStatus] = useState<CallStatus>("aberto"); const [assignee, setAssignee] = useState("none"); const [notes, setNotes] = useState(""); const [message, setMessage] = useState("");
  useEffect(() => { if (call) { setStatus(call.status); setAssignee(call.assignee_id ?? "none"); setNotes(call.internal_notes ?? ""); } }, [call]);
  const details = useQuery({ queryKey: ["internal-call-detail", call?.id], enabled: Boolean(call), queryFn: async () => { if (!call) return { logs: [], messages: [], attachments: [] }; const [{ data: logs }, { data: messages }, { data: attachments }] = await Promise.all([supabase.from("internal_call_logs").select("*").eq("call_id", call.id).order("created_at", { ascending: false }), supabase.from("internal_call_messages").select("*").eq("call_id", call.id).order("created_at"), supabase.from("internal_call_attachments").select("*").eq("call_id", call.id).order("created_at")]); return { logs: logs ?? [], messages: messages ?? [], attachments: attachments ?? [] }; } });
  const update = useMutation({ mutationFn: async () => { if (!call) return; const { error } = await supabase.from("internal_calls").update({ status, assignee_id: assignee === "none" ? null : assignee, internal_notes: notes.trim() || null }).eq("id", call.id); if (error) throw error; }, onSuccess: () => { toast.success("Chamado atualizado"); onClose(); onUpdated(); }, onError: (error: Error) => toast.error(error.message) });
  const send = useMutation({ mutationFn: async () => { if (!call || !data?.userId || !message.trim()) throw new Error("Digite uma mensagem"); const { error } = await supabase.from("internal_call_messages").insert({ call_id: call.id, author_id: data.userId, message: message.trim() }); if (error) throw error; }, onSuccess: () => { setMessage(""); void details.refetch(); toast.success("Mensagem enviada"); }, onError: (error: Error) => toast.error(error.message) });
  async function openAttachment(path: string) { const { data: signed, error } = await supabase.storage.from("internal-call-attachments").createSignedUrl(path, 300); if (error) return toast.error(error.message); window.open(signed.signedUrl, "_blank", "noopener,noreferrer"); }
  return <Dialog open={Boolean(call)} onOpenChange={(value) => { if (!value) onClose(); }}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">{call ? <div className="space-y-5"><DialogHeader><DialogTitle>#{call.call_number} — {call.title}</DialogTitle><DialogDescription>{CATEGORIES[call.category]} · Solicitante: {names.get(call.reporter_id)} · {new Date(call.created_at).toLocaleString("pt-BR")}</DialogDescription></DialogHeader><p className="whitespace-pre-wrap text-sm">{call.description}</p><div className="flex flex-wrap gap-2"><Badge variant="status">{STATUSES[call.status]}</Badge><Badge variant="outline">Prioridade {PRIORITIES[call.priority]}</Badge>{call.source === "site_survey" ? <Badge variant="outline">Site Survey</Badge> : null}</div>
    {details.data?.attachments.length ? <div><p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Paperclip className="h-4 w-4" />Anexos</p>{details.data.attachments.map((attachment) => <Button key={attachment.id} variant="outline" size="sm" onClick={() => openAttachment(attachment.storage_path)}>{attachment.file_name}</Button>)}</div> : null}
    <div className="space-y-3 border-t pt-4"><p className="flex items-center gap-2 font-semibold"><MessageCircle className="h-4 w-4" />Mensagens</p>{details.data?.messages.map((entry) => <div key={entry.id} className="rounded-md bg-muted p-3 text-sm"><div className="mb-1 flex justify-between gap-2 font-semibold"><span>{names.get(entry.author_id)}</span><span className="text-xs font-normal text-muted-foreground">{new Date(entry.created_at).toLocaleString("pt-BR")}</span></div><p className="whitespace-pre-wrap">{entry.message}</p></div>)}<div><Textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} placeholder="Escreva uma mensagem" /><div className="mt-2 flex justify-end"><Button size="sm" onClick={() => send.mutate()} disabled={!message.trim() || send.isPending}><Send className="h-4 w-4" />Enviar</Button></div></div></div>
    {data?.isAdmin ? <div className="space-y-3 border-t pt-4"><h3 className="font-semibold">Gestão do chamado</h3><div className="grid gap-3 sm:grid-cols-2"><div><Label>Situação</Label><Select value={status} onValueChange={(value) => setStatus(value as CallStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STATUSES).map(([key, text]) => <SelectItem key={key} value={key}>{text}</SelectItem>)}</SelectContent></Select></div><div><Label>Responsável</Label><Select value={assignee} onValueChange={setAssignee}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem responsável</SelectItem>{data.responsible.map((profile) => <SelectItem key={profile.id} value={profile.id}>{profile.full_name || profile.email}</SelectItem>)}</SelectContent></Select></div></div><div><Label>Observações internas</Label><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={4000} /></div><Button onClick={() => update.mutate()} disabled={update.isPending}>Salvar andamento</Button></div> : call.internal_notes ? <p className="whitespace-pre-wrap text-sm">{call.internal_notes}</p> : null}
    <div className="border-t pt-4"><p className="mb-2 flex items-center gap-2 font-semibold"><History className="h-4 w-4" />Histórico</p><div className="space-y-2"><div className="rounded-md bg-muted p-2 text-xs">Chamado aberto · {new Date(call.created_at).toLocaleString("pt-BR")}</div>{details.data?.logs.map((log) => <div key={log.id} className="rounded-md bg-muted p-2 text-xs">{log.previous_status !== log.new_status ? `${STATUSES[log.previous_status as CallStatus] ?? "—"} → ${STATUSES[log.new_status as CallStatus] ?? "—"}` : "Responsável ou observação atualizados"} · {new Date(log.created_at).toLocaleString("pt-BR")}</div>)}</div></div>
  </div> : null}</DialogContent></Dialog>;
}