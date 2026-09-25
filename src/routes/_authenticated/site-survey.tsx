import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, Camera, Check, ChevronDown, ChevronsUpDown, ClipboardCheck, FileText, GripVertical, History, MapPin, Minus, Package, Pencil, Plus, Search, ShieldCheck, Trash2, UsersRound, Save, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { MyioAppLogo } from "@/components/myio-app-logo";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { SiteSurveyEnvironmentManager } from "@/components/site-survey-environment-manager";
import { SiteSurveyLucManager } from "@/components/site-survey-luc-manager";
import { SiteSurveyProfilesAdmin } from "@/components/site-survey-profiles-admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AppHeader } from "@/components/app-header";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const PERMISSIONS = [
  ["site_survey_visitas_minhas", "Minhas visitas"],
  ["site_survey_visitas_todas", "Todas as visitas"],
  ["site_survey_agendar", "Criar e agendar"],
  ["site_survey_editar", "Editar agendamentos"],
  ["site_survey_executar", "Executar e preencher"],
  ["site_survey_revisar", "Revisar e reabrir"],
  ["site_survey_excluir", "Excluir visitas"],
  ["site_survey_usuarios", "Usuários"],
  ["site_survey_perfis", "Perfis de acesso"],
  ["site_survey_logs", "Logs"],
  ["site_survey_configuracoes", "Modelos de checklist"],
  ["site_survey_cadastro", "Cadastro e Diversos"],
] as const;

const SITE_SURVEY_PERMISSION_GROUPS = [
  {
    label: "Visitas",
    children: PERMISSIONS.slice(0, 7),
  },
  {
    label: "Checklists",
    children: PERMISSIONS.slice(10, 11),
  },
  {
    label: "Cadastro",
    children: PERMISSIONS.slice(11, 12),
  },
  {
    label: "Usuários",
    children: PERMISSIONS.slice(7, 10),
  },
] as const;

type VisitStatus = "agendada" | "em_andamento" | "em_revisao" | "concluida" | "cancelada";
type Visit = {
  id: string; survey_number: number; client_id: string | null; client_unit_id: string | null; project_id: string | null;
  technician_id: string; created_by: string; template_id: string | null; status: VisitStatus; scheduled_start: string;
  scheduled_end: string | null; address: string; contact_name: string | null; contact_phone: string | null; notes: string | null;
  review_notes: string | null; started_at: string | null; submitted_at: string | null; completed_at: string | null;
  luc_number: string | null; shop_name: string | null; environments: unknown;
};
type Named = { id: string; name: string };
type ClientOption = Named & { category_id: string | null };
type ProjectOption = Named & { client_id: string | null };
type ClientCategory = Named;
type Profile = { id: string; full_name: string; email: string | null; mobile_phone: string | null };
type Template = { id: string; name: string; description: string | null; active: boolean; client_category_id: string | null; is_default: boolean };
type Section = { id: string; template_id: string; title: string; description: string | null; position: number; active: boolean };
type QuestionConfig = { condition?: { value?: string }; detail?: { label?: string; required?: boolean; options?: string[]; repeatable?: boolean; suboptions?: Record<string, string[]> }; photo?: { required?: boolean; required_when?: string }; photo_only?: boolean; create_ticket?: boolean; weather_required?: boolean; classification?: boolean; other_detail?: boolean };
type Question = { id: string; section_id: string; question_key: string | null; conditioned_on_question_id: string | null; conditioned_operator: "equals" | "not_equals"; conditioned_value: string | null; prompt: string; question_type: "checkbox" | "text" | "textarea" | "number" | "select" | "radio" | "multiselect"; required: boolean; options: unknown; configuration: unknown; position: number; active: boolean };
type SurveyAction = Named & { description: string | null; active: boolean; position: number };
type QuestionAction = { id: string; question_id: string; action_id: string; trigger_value: string; active: boolean };
type GeneratedCall = { id: string; question_action_id: string; question_id: string; visit_luc_id: string | null; visit_environment_id: string | null; status: string; internal_call_id: string | null; internal_calls: { call_number: string | null } | null };
type SurveyAttachment = { id: string; question_id: string | null; visit_luc_id: string | null; visit_environment_id: string | null; file_name: string; storage_path: string; content_type: string | null };
type SurveyPoint = { value: string; label: string; completionStatus: "pendente" | "concluida" | "cancelada"; templateId: string | null };
type CatalogItem = Named & { category: "material" | "equipamento"; active: boolean; position: number };
type CancellationReason = Named & { active: boolean; position: number };
type CustomCatalogItem = Named & { catalog_id: string; active: boolean; position: number };
type CustomCatalog = Named & { active: boolean; position: number; site_survey_custom_catalog_items: CustomCatalogItem[] };

const sortByPosition = <T extends { position: number; id: string }>(items: T[]) =>
  [...items].sort((left, right) => left.position - right.position || left.id.localeCompare(right.id));
type VisitTechnician = { technician_id: string; mobile_phone: string };

const STATUS: Record<VisitStatus, string> = { agendada: "Agendada", em_andamento: "Em andamento", em_revisao: "Em revisão", concluida: "Concluída", cancelada: "Cancelada" };
const STATUS_ORDER: VisitStatus[] = ["agendada", "em_andamento", "em_revisao", "concluida", "cancelada"];
const questionRequiresPhoto = (question: Question, answer?: unknown) => {
  const photo = (question.configuration as QuestionConfig | null)?.photo;
  if (!photo?.required) return false;
  return !photo.required_when || answerMatches(answerParts(answer).value, photo.required_when);
};
const isOtherOption = (value: string) => {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
  return normalized === "outro" || normalized === "outros";
};
const isSpecialEquipmentQuestion = (question: Question) => {
  const normalized = question.prompt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  return normalized.includes("equipamento") && normalized.includes("ferramenta especial");
};
const isAffirmativeAnswer = (value: unknown) => value === true || String(value ?? "").trim().toLocaleLowerCase("pt-BR") === "sim";
const questionConfigurationFromForm = (values: FormData, current: QuestionConfig = {}) => {
  const { photo: _photo, ...base } = current;
  if (values.get("photo_enabled") !== "on") return base;
  const required = values.get("photo_required") === "on";
  const requiredWhen = String(values.get("photo_required_when") ?? "").trim();
  return { ...base, photo: { required, ...(required && requiredWhen ? { required_when: requiredWhen } : {}) } };
};

export const Route = createFileRoute("/_authenticated/site-survey")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_app_access").select("app_key").eq("user_id", context.user.id).eq("app_key", "site_survey").maybeSingle();
    if (!data) throw redirect({ to: "/portal" });
  },
  component: SiteSurveyPage,
  head: () => ({ meta: [
    { title: "Site Survey | myio ERP" },
    { name: "description", content: "Agendamento, execução e acompanhamento de visitas técnicas de implantação." },
    { property: "og:title", content: "Site Survey | myio ERP" },
    { property: "og:description", content: "Visitas técnicas de implantação na plataforma myio ERP." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function SiteSurveyPage() {
  const qc = useQueryClient();
  const [section, setSection] = useState("visitas");
  const [visitsSection, setVisitsSection] = useState("minhas");
  const [userSection, setUserSection] = useState("lista");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Visit | null>(null);
  const [visitsListOpen, setVisitsListOpen] = useState(true);
  const [expandedVisitIds, setExpandedVisitIds] = useState<Set<string>>(() => new Set());
  const { data, isLoading } = useQuery({
    queryKey: ["site-survey-data"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão não encontrada");
      const [{ data: visits, error }, { data: clients }, { data: clientCategories }, { data: projects }, { data: units }, { data: technicians }, { data: templates }, { data: sections }, { data: questions }, { data: surveyProfile }, { data: surveyPermissions }, { data: erpAdmin }, { data: catalog }, { data: screwdriverTypes }, { data: wrenchSizes }, { data: actionCatalog }, { data: questionActions }, { data: customCatalogs }, { data: cancellationReasons }] = await Promise.all([
        supabase.from("site_survey_visits").select("*").order("scheduled_start", { ascending: false }),
        supabase.from("clients").select("id,name,category_id").order("name"),
        supabase.from("client_categories").select("id,name").eq("active", true).order("position"),
        supabase.from("projects").select("id,name,client_id").order("name"),
        supabase.from("client_units").select("id,name,client_id").eq("active", true).order("name"),
        supabase.rpc("get_site_survey_users"),
        supabase.from("site_survey_templates").select("*").order("name"),
        supabase.from("site_survey_sections").select("*").order("position"),
        supabase.from("site_survey_questions").select("*").order("position"),
        supabase.from("site_survey_user_profiles").select("profile_code,is_customized,site_survey_access_profiles(name,site_survey_profile_permissions(permission_key,allowed))").eq("user_id", auth.user.id).maybeSingle(),
        supabase.from("site_survey_user_permissions").select("permission_key,allowed").eq("user_id", auth.user.id),
        supabase.from("erp_admins").select("user_id").eq("user_id", auth.user.id).maybeSingle(),
        supabase.from("site_survey_material_catalog").select("*").order("position").order("name"),
        supabase.from("site_survey_screwdriver_types").select("id,name").eq("active", true).order("position").order("name"),
        supabase.from("site_survey_wrench_sizes").select("id,name").eq("active", true).order("position").order("name"),
        supabase.from("site_survey_action_catalog").select("id,name,description,active,position").order("position").order("name"),
        supabase.from("site_survey_question_actions").select("id,question_id,action_id,trigger_value,active").eq("active", true),
        supabase.from("site_survey_custom_catalogs").select("id,name,active,position,site_survey_custom_catalog_items(id,catalog_id,name,active,position)").eq("active", true).order("position").order("name"),
        supabase.from("site_survey_cancellation_reasons").select("id,name,active,position").eq("active", true).order("position").order("name"),
      ]);
      if (error) throw error;
      const profile = surveyProfile as unknown as { profile_code: string; is_customized: boolean; site_survey_access_profiles: { name: string; site_survey_profile_permissions: Array<{ permission_key: string; allowed: boolean }> } | null } | null;
      const permissions = new Set<string>(Boolean(erpAdmin) ? PERMISSIONS.map(([key]) => key) : profile?.is_customized ? (surveyPermissions ?? []).filter((item) => item.allowed).map((item) => item.permission_key) : (profile?.site_survey_access_profiles?.site_survey_profile_permissions ?? []).filter((item) => item.allowed).map((item) => item.permission_key));
      return { userId: auth.user.id, visits: (visits ?? []) as Visit[], clients: (clients ?? []) as ClientOption[], clientCategories: (clientCategories ?? []) as ClientCategory[], projects: (projects ?? []) as ProjectOption[], units: (units ?? []) as Array<Named & { client_id: string }>, technicians: (technicians ?? []) as Profile[], templates: (templates ?? []) as Template[], sections: (sections ?? []) as Section[], questions: (questions ?? []) as Question[], catalog: (catalog ?? []) as CatalogItem[], screwdriverTypes: (screwdriverTypes ?? []) as Named[], wrenchSizes: (wrenchSizes ?? []) as Named[], actionCatalog: (actionCatalog ?? []) as SurveyAction[], questionActions: (questionActions ?? []) as QuestionAction[], customCatalogs: (customCatalogs ?? []) as CustomCatalog[], cancellationReasons: (cancellationReasons ?? []) as CancellationReason[], permissions, profileName: profile?.site_survey_access_profiles?.name ?? "Sem perfil", isErpAdmin: Boolean(erpAdmin) };
    },
  });
  const can = (permission: string) => data?.permissions.has(permission) ?? false;
  const names = useMemo(() => ({
    clients: new Map(data?.clients.map((item) => [item.id, item.name])), projects: new Map(data?.projects.map((item) => [item.id, item.name])), technicians: new Map(data?.technicians.map((item) => [item.id, item.full_name || item.email || "Técnico"])),
  }), [data]);
  const filtered = (data?.visits ?? []).filter((visit) => {
    const haystack = [visit.survey_number, names.clients.get(visit.client_id ?? ""), names.projects.get(visit.project_id ?? ""), names.technicians.get(visit.technician_id), visit.address].join(" ").toLocaleLowerCase("pt-BR");
    return (statusFilter === "todos" || visit.status === statusFilter) && haystack.includes(search.toLocaleLowerCase("pt-BR"));
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["site-survey-data"] });
  const cancelVisit = async (visit: Visit) => {
    const { error } = await supabase.from("site_survey_visits").update({ status: "cancelada", cancelled_at: new Date().toISOString() }).eq("id", visit.id);
    if (error) return toast.error(error.message);
    if (selected?.id === visit.id) setSelected(null);
    toast.success("Visita cancelada");
    void invalidate();
  };

  if (isLoading || !data) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando Site Survey...</div>;
  const tabs = [
    { value: "visitas", label: "Visitas", icon: CalendarDays, allowed: can("site_survey_visitas_minhas") || can("site_survey_visitas_todas") },
    { value: "checklists", label: "Checklists", icon: ClipboardCheck, allowed: can("site_survey_configuracoes") },
    { value: "cadastro", label: "Cadastro", icon: Package, allowed: can("site_survey_cadastro") || can("site_survey_configuracoes") },
    { value: "usuarios", label: "Usuários", icon: UsersRound, allowed: can("site_survey_usuarios") || can("site_survey_perfis") || can("site_survey_logs") },
  ].filter((item) => item.allowed);
  const userTabs = [
    { value: "lista", label: "Usuários", icon: UsersRound, allowed: can("site_survey_usuarios") },
    { value: "perfis", label: "Perfis de acesso", icon: ShieldCheck, allowed: can("site_survey_perfis") },
    { value: "logs", label: "Logs", icon: History, allowed: can("site_survey_logs") },
  ].filter((item) => item.allowed);

  return <div className="min-h-screen bg-background">
    <AppHeader logo={<MyioAppLogo appName="Site Survey" className="text-base sm:text-2xl" />}><Badge variant="outline">{data.profileName}</Badge></AppHeader>
    <main className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6">
      <Tabs value={section} onValueChange={setSection}>
        <TabsContent value="visitas">
          <Tabs value={visitsSection} onValueChange={setVisitsSection}>
            <TabsContent value="minhas">
              <section className="mb-5 overflow-hidden rounded-md border border-border bg-card shadow-sm" aria-label="Resumo de visitas">
                <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3">
                  <h2 className="truncate text-xs font-bold uppercase text-muted-foreground">Resumo de visitas</h2>
                  <span className="shrink-0 rounded-full bg-myio-green/10 px-2 py-1 text-[10px] font-semibold text-myio-green">Atualizado</span>
                </header>
                <div className="divide-y divide-border p-2 lg:grid lg:grid-cols-5 lg:divide-x lg:divide-y-0">
                  {STATUS_ORDER.map((status) => {
                    const count = data.visits.filter((visit) => visit.status === status).length;
                    const isActive = count > 0;
                    return <div
                      key={status}
                      className={`flex min-h-12 items-center justify-between gap-3 rounded-sm px-3 py-2.5 transition-colors lg:min-h-16 lg:rounded-none lg:px-4 ${isActive ? "bg-myio-green/5" : "hover:bg-muted/40"}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`h-6 w-1.5 shrink-0 rounded-full ${isActive ? "bg-myio-green" : "bg-muted-foreground/25"}`} aria-hidden="true" />
                        <span className={`truncate text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{STATUS[status]}</span>
                      </div>
                      <strong className={`shrink-0 text-lg leading-none ${isActive ? "text-foreground" : "text-muted-foreground/70"}`}>{count}</strong>
                    </div>;
                  })}
                </div>
              </section>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar visita, cliente, projeto ou técnico" className="pl-9" /></div><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todas as situações</SelectItem>{STATUS_ORDER.map((status) => <SelectItem key={status} value={status}>{STATUS[status]}</SelectItem>)}</SelectContent></Select></div>
               <div className="overflow-hidden rounded-md border border-border bg-card">
                 <div className="hidden grid-cols-[250px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_150px_70px] items-center gap-3 border-b bg-primary/20 px-4 py-3 text-sm font-semibold lg:grid"><span>Nº / Abrir</span><span>Cliente / Projeto</span><span>Técnico</span><span>Agendamento</span><span>Situação</span><span className="flex items-center justify-between gap-2">Ações<Button type="button" size="compactIcon" variant="ghost" aria-label={visitsListOpen ? "Recolher relação de visitas" : "Exibir relação de visitas"} title={visitsListOpen ? "Recolher" : "Exibir"} onClick={() => setVisitsListOpen((current) => !current)}><ChevronDown className={`h-5 w-5 transition-transform ${visitsListOpen ? "rotate-180" : ""}`} /></Button></span></div>
                 {filtered.map((visit) => {
                   const visitExpanded = expandedVisitIds.has(visit.id);
                   return <div key={visit.id} className={`${visitsListOpen ? "" : "lg:hidden"} grid gap-3 border-b border-border px-4 py-3 last:border-0 lg:grid-cols-[250px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_150px_70px] lg:items-center lg:py-4`}>
                      <div className="flex items-center justify-between gap-3 lg:block"><button type="button" className={`w-fit whitespace-nowrap text-left text-sm font-semibold transition-colors hover:text-myio-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected?.id === visit.id ? "text-myio-green" : "text-foreground"}`} aria-pressed={selected?.id === visit.id} aria-label={`Exibir visita ${String(visit.survey_number).padStart(12, "0")}`} onClick={() => setSelected((current) => current?.id === visit.id ? null : visit)}>{String(visit.survey_number).padStart(12, "0")}</button><Button type="button" size="compactIcon" variant="ghost" className="lg:hidden" aria-label={visitExpanded ? `Recolher informações da visita ${visit.survey_number}` : `Exibir informações da visita ${visit.survey_number}`} title={visitExpanded ? "Recolher" : "Exibir"} onClick={() => setExpandedVisitIds((current) => { const next = new Set(current); if (next.has(visit.id)) next.delete(visit.id); else next.add(visit.id); return next; })}><ChevronDown className={`h-5 w-5 transition-transform ${visitExpanded ? "rotate-180" : ""}`} /></Button></div>
                     <div className={`${visitExpanded ? "" : "hidden"} min-w-0 lg:block`}><p className="truncate text-sm font-medium">{names.clients.get(visit.client_id ?? "") ?? names.projects.get(visit.project_id ?? "") ?? "—"}</p>{visit.client_id && visit.project_id ? <p className="truncate text-xs text-muted-foreground">{names.projects.get(visit.project_id)}</p> : null}</div>
                     <span className={`${visitExpanded ? "" : "hidden"} truncate text-sm lg:block`}>{names.technicians.get(visit.technician_id) ?? "—"}</span>
                     <div className={`${visitExpanded ? "" : "hidden"} text-sm lg:block`}><p>{new Date(visit.scheduled_start).toLocaleDateString("pt-BR")}</p><p className="text-xs text-muted-foreground">{new Date(visit.scheduled_start).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p></div>
                     <Badge variant="status" className={`${visitExpanded ? "" : "hidden"} w-fit lg:inline-flex`}>{STATUS[visit.status]}</Badge>
                     <div className={`${visitExpanded ? "flex" : "hidden"} gap-1 lg:flex`}>{can("site_survey_editar") ? <VisitDialog data={data} visit={visit} onSaved={invalidate} /> : null}{can("site_survey_editar") && visit.status !== "cancelada" && visit.status !== "concluida" ? <ConfirmDeleteButton title="Cancelar visita?" description="Confirme o cancelamento desta visita. O histórico da OS será mantido." ariaLabel="Cancelar visita" confirmLabel="Confirmar cancelamento" pendingLabel="Cancelando..." onConfirm={() => void cancelVisit(visit)} trigger={<Button type="button" size="compactIcon" variant="ghost" title="Cancelar visita" aria-label="Cancelar visita"><X className="h-3.5 w-3.5" /></Button>} /> : null}{can("site_survey_excluir") ? <ConfirmDeleteButton title="Excluir visita?" description="Esta ação excluirá definitivamente a visita, respostas, fotos e histórico" confirmLabel="Excluir" equalActions onConfirm={async () => { const { error } = await supabase.from("site_survey_visits").delete().eq("id", visit.id); if (error) return toast.error(error.message); toast.success("Visita excluída"); invalidate(); }} /> : null}</div>
                   </div>;
                 })}
                 {filtered.length === 0 ? <p className={`${visitsListOpen ? "" : "lg:hidden"} px-4 py-12 text-center text-sm text-muted-foreground`}>Nenhuma visita encontrada.</p> : null}
               </div>
               <VisitDetails visit={selected} data={data} onClose={() => setSelected(null)} onChanged={() => { invalidate(); setSelected(null); }} />
                      </TabsContent>
            {can("site_survey_agendar") ? <TabsContent value="nova"><VisitDialog data={data} inline onSaved={() => { invalidate(); setVisitsSection("minhas"); }} /></TabsContent> : null}
          </Tabs>
        </TabsContent>
        <TabsContent value="checklists"><ChecklistAdmin data={data} onChanged={invalidate} /></TabsContent>
        <TabsContent value="cadastro"><SurveyCatalogAdmin data={data} onChanged={invalidate} /></TabsContent>
        <TabsContent value="usuarios">
          <Tabs value={userSection} onValueChange={setUserSection}>
            {can("site_survey_usuarios") ? <TabsContent value="lista"><SurveyUsersAdmin /></TabsContent> : null}
            {can("site_survey_perfis") ? <TabsContent value="perfis"><SiteSurveyProfilesAdmin /></TabsContent> : null}
            {can("site_survey_logs") ? <TabsContent value="logs"><SurveyLogs names={names} /></TabsContent> : null}
          </Tabs>
        </TabsContent>
      </Tabs>
    </main>
    <nav className="fixed inset-x-3 bottom-3 z-50" aria-label="Navegação do Site Survey">
      <div className="mx-auto grid max-w-md grid-cols-4 items-stretch rounded-[1.75rem] border border-border bg-card/95 p-1.5 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/90">
        {tabs.map(({ value, label, icon: Icon }) => {
          const active = section === value;
          const hasSubmenu = value === "visitas" || value === "usuarios";
          const selectSection = () => setSection(value);
          const item = <span className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1"><Icon className="h-5 w-5 shrink-0" /><span className="max-w-full truncate text-[10px] font-semibold leading-none">{label}</span></span>;
          const itemClassName = `h-auto min-w-0 rounded-[1.35rem] p-0 shadow-none ${active ? "!bg-primary/15 !text-primary hover:!bg-primary/20 hover:!text-primary" : "!bg-transparent !text-muted-foreground hover:!bg-muted hover:!text-foreground"}`;
          if (!hasSubmenu) return <Button key={value} type="button" variant="ghost" className={itemClassName} onClick={selectSection} aria-current={active ? "page" : undefined}>{item}</Button>;
          const submenuItems = value === "visitas"
            ? [{ value: "minhas", label: "Minhas visitas", icon: CalendarDays }, ...(can("site_survey_agendar") ? [{ value: "nova", label: "Nova visita", icon: Plus }] : [])]
            : userTabs;
          return <DropdownMenu key={value}><DropdownMenuTrigger asChild><Button type="button" variant="ghost" className={itemClassName} onClick={selectSection} aria-current={active ? "page" : undefined}>{item}</Button></DropdownMenuTrigger><DropdownMenuContent side="top" align="center" sideOffset={10} className="w-56 rounded-lg p-1.5 shadow-xl"><DropdownMenuLabel>{label}</DropdownMenuLabel><DropdownMenuSeparator />{submenuItems.map(({ value: subValue, label: subLabel, icon: SubIcon }) => { const subActive = value === "visitas" ? visitsSection === subValue : userSection === subValue; return <DropdownMenuItem key={subValue} className="min-h-11 rounded-md" onSelect={() => { selectSection(); if (value === "visitas") setVisitsSection(subValue); else setUserSection(subValue); }}><SubIcon className="h-4 w-4" /><span className="flex-1">{subLabel}</span>{subActive ? <Check className="h-4 w-4 text-primary" /> : null}</DropdownMenuItem>; })}</DropdownMenuContent></DropdownMenu>;
        })}
      </div>
    </nav>
  </div>;
}

function VisitDialog({ data, visit, onSaved, inline = false }: { data: NonNullable<ReturnType<typeof useSurveyDataShape>>; visit?: Visit; onSaved: () => void; inline?: boolean }) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState(visit?.client_id ?? "none");
  const [projectId, setProjectId] = useState(visit?.project_id ?? "none");
  const linkedClientId = clientId !== "none" ? clientId : data.projects.find((project) => project.id === projectId)?.client_id ?? null;
  const selectedClient = data.clients.find((client) => client.id === linkedClientId);
  const selectedCategory = data.clientCategories.find((category) => category.id === selectedClient?.category_id);
  const isShopping = selectedCategory?.name.trim().toLocaleLowerCase("pt-BR") === "shoppings";
  const save = useMutation({ mutationFn: async (form: HTMLFormElement) => {
    const values = new FormData(form); const projectId = String(values.get("project_id")); const selectedClient = String(values.get("client_id"));
    if (selectedClient === "none" && projectId === "none") throw new Error("Selecione um cliente e/ou projeto.");
    const selectedClientRecord = data.clients.find((item) => item.id === linkedClientId); const defaultTemplate = data.templates.find((item) => item.active && item.is_default && item.client_category_id === selectedClientRecord?.category_id);
    const selectedTemplate = isShopping ? defaultTemplate?.id : String(values.get("template_id")) === "none" ? null : String(values.get("template_id"));
    if (isShopping && !selectedTemplate) throw new Error("O checklist padrão de Shoppings não está disponível.");
    const payload = { client_id: selectedClient === "none" ? null : selectedClient, client_unit_id: String(values.get("client_unit_id")) === "none" ? null : String(values.get("client_unit_id")), project_id: projectId === "none" ? null : projectId, technician_id: String(values.get("technician_id")), template_id: selectedTemplate, scheduled_start: new Date(String(values.get("scheduled_start"))).toISOString(), scheduled_end: values.get("scheduled_end") ? new Date(String(values.get("scheduled_end"))).toISOString() : null, address: String(values.get("address")), contact_name: String(values.get("contact_name")) || null, contact_phone: String(values.get("contact_phone")) || null, notes: String(values.get("notes")) || null, luc_number: null, shop_name: null, environments: [] };
    const result = visit ? await supabase.from("site_survey_visits").update(payload).eq("id", visit.id).select("id").single() : await supabase.from("site_survey_visits").insert({ ...payload, created_by: data.userId }).select("id").single();
    if (result.error) throw result.error;
  }, onSuccess: () => { toast.success(visit ? "Visita atualizada" : "Visita agendada"); setOpen(false); onSaved(); }, onError: (error: Error) => toast.error(error.message) });
  const localDate = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 16) : "";
  const form = <form onSubmit={(event) => { event.preventDefault(); save.mutate(event.currentTarget); }} className="space-y-5">{inline ? <div className="space-y-1.5"><h2 className="text-lg font-semibold">Nova visita técnica</h2><p className="text-sm text-muted-foreground">Informe o cliente, o responsável, a data e o local. Os ambientes serão cadastrados após salvar a OS.</p></div> : <DialogHeader><DialogTitle>{visit ? "Editar visita" : "Nova visita técnica"}</DialogTitle><DialogDescription>Informe o cliente, o responsável, a data e o local. Os ambientes serão cadastrados após salvar a OS.</DialogDescription></DialogHeader>}<div className="grid gap-4 sm:grid-cols-2"><FormSelect name="client_id" label="Cliente" value={clientId} onChange={setClientId} options={data.clients} optional /><FormSelect name="client_unit_id" label="Unidade / filial" defaultValue={visit?.client_unit_id ?? "none"} options={data.units.filter((unit) => clientId === "none" || unit.client_id === clientId)} optional /><FormSelect name="project_id" label="Projeto" value={projectId} onChange={setProjectId} options={data.projects} optional /><FormSelect name="technician_id" label="Técnico responsável" defaultValue={visit?.technician_id ?? data.userId} options={data.technicians.map((item) => ({ id: item.id, name: item.full_name || item.email || "Técnico" }))} />{isShopping ? <div className="space-y-2"><Label>Checklist</Label><p className="flex h-9 items-center text-sm font-medium">Shoppings — padrão automático</p></div> : <FormSelect name="template_id" label="Checklist" defaultValue={visit?.template_id ?? "none"} options={data.templates.filter((item) => item.active)} optional />}<div /></div><div className="grid gap-4 sm:grid-cols-2"><DateTimeInput name="scheduled_start" label="Início" defaultValue={localDate(visit?.scheduled_start)} required /><DateTimeInput name="scheduled_end" label="Término previsto" defaultValue={localDate(visit?.scheduled_end)} /><LabeledInput name="contact_name" label="Contato no local" defaultValue={visit?.contact_name ?? ""} /><PhoneInput name="contact_phone" label="Telefone" defaultValue={visit?.contact_phone ?? ""} /></div><AddressAutocomplete name="address" label="Local da visita" defaultValue={visit?.address} allowDeliveryPoints={false} required /><div className="space-y-2"><Label htmlFor="survey-notes">Observações</Label><Textarea id="survey-notes" name="notes" defaultValue={visit?.notes ?? ""} rows={3} /></div><DialogFooter><Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar visita"}</Button></DialogFooter></form>;
  if (inline) return <div className="max-w-3xl py-2">{form}</div>;
  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) { setClientId(visit?.client_id ?? "none"); setProjectId(visit?.project_id ?? "none"); } }}><DialogTrigger asChild><Button size="compactIcon" variant="ghost" title="Editar visita" aria-label="Editar visita"><Pencil className="h-3.5 w-3.5" /></Button></DialogTrigger><DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">{form}</DialogContent></Dialog>;
}

function ChecklistSection({ section, order, open, pendingCount, onToggle, children }: { section: Section; order: number; open: boolean; pendingCount: number; onToggle: () => void; children: ReactNode }) {
  return <section className="overflow-hidden rounded-md border border-border bg-card transition-colors">
    <Button type="button" variant="ghost" className="h-auto w-full justify-between rounded-none !bg-card px-4 py-3 text-left !text-foreground hover:!bg-muted/50 hover:!text-foreground" onClick={onToggle} aria-expanded={open}>
      <span className="flex min-w-0 items-center gap-3"><span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-myio-green/10 text-sm font-bold text-myio-green">{order}{pendingCount > 0 ? <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-card" aria-label={`${pendingCount} ${pendingCount === 1 ? "pendência" : "pendências"}`}>{pendingCount > 99 ? "99+" : pendingCount}</span> : null}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-foreground">{section.title}</span>{section.description ? <span className="block truncate text-xs text-muted-foreground">{section.description}</span> : null}</span></span>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-myio-green" aria-hidden="true">{open ? <Minus className="h-5 w-5" strokeWidth={3} /> : <Plus className="h-5 w-5" strokeWidth={3} />}</span>
    </Button>
    <div className={`${open ? "block" : "hidden"} space-y-3 border-t border-border p-3 sm:p-4`}>{children}</div>
  </section>;
}

function VisitDetails({ visit, data, onClose, onChanged }: { visit: Visit | null; data: NonNullable<ReturnType<typeof useSurveyDataShape>>; onClose: () => void; onChanged: () => void }) {
  const [reviewNotes, setReviewNotes] = useState(""); const [files, setFiles] = useState<File[]>([]);
  const [materialRows, setMaterialRows] = useState<Array<{ catalog_item_id: string; quantity: string; notes: string; screwdriver_type_id: string; wrench_size_id: string }>>([]);
  const [noAdditionalMaterial, setNoAdditionalMaterial] = useState(false);
  const [visitTechnicians, setVisitTechnicians] = useState<VisitTechnician[]>([{ technician_id: "", mobile_phone: "" }]);
  const [selectedPoint, setSelectedPoint] = useState("");
  const [pointFilter, setPointFilter] = useState("");
  const [pointPickerOpen, setPointPickerOpen] = useState(false);
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const [approvedActionKeys, setApprovedActionKeys] = useState<Set<string>>(() => new Set());
  const [declinedActionKeys, setDeclinedActionKeys] = useState<Set<string>>(() => new Set());
  const [pendingAction, setPendingAction] = useState<{ key: string; actionName: string } | null>(null);
  const [pendingPointSave, setPendingPointSave] = useState<{ form: HTMLFormElement; fields: string[] } | null>(null);
  const [cancelPointOpen, setCancelPointOpen] = useState(false);
  const [cancellationReasonId, setCancellationReasonId] = useState("");
  const [cancellingPoint, setCancellingPoint] = useState(false);
  const [specialEquipmentAnswer, setSpecialEquipmentAnswer] = useState("");
  const visitQuestions = sortByPosition(data.questions.filter((question) => question.active && data.sections.some((section) => section.active && section.id === question.section_id && section.template_id === visit?.template_id)));
  const visitSections = sortByPosition(data.sections.filter((section) => section.active && section.template_id === visit?.template_id));
  const generalSections = visitSections.slice(0, 3);
  const generalQuestionIds = new Set(visitQuestions.filter((question) => generalSections.some((section) => section.id === question.section_id)).map((question) => question.id));
  const { data: detail, refetch: refetchDetail } = useQuery({ queryKey: ["site-survey-detail", visit?.id], enabled: Boolean(visit), queryFn: async () => { const [{ data: responses }, { data: attachments }, { data: logs }, { data: lucHistory }, { data: visitMaterials }, { data: materialDecisions }, { data: technicians }, { data: lucs }, { data: environments }, { data: generatedCalls }] = await Promise.all([supabase.from("site_survey_responses").select("*").eq("visit_id", visit?.id ?? ""), supabase.from("site_survey_attachments").select("*").eq("visit_id", visit?.id ?? "").order("created_at"), supabase.from("site_survey_logs").select("*").eq("visit_id", visit?.id ?? "").order("created_at", { ascending: false }), supabase.from("site_survey_luc_history").select("*").eq("visit_id", visit?.id ?? "").order("valid_from", { ascending: false }), supabase.from("site_survey_visit_materials").select("*").eq("visit_id", visit?.id ?? "").order("created_at"), supabase.from("site_survey_material_decisions").select("*").eq("visit_id", visit?.id ?? ""), supabase.from("site_survey_visit_technicians").select("technician_id,mobile_phone,visit_luc_id,visit_environment_id").eq("visit_id", visit?.id ?? "").order("created_at"), supabase.from("site_survey_visit_lucs").select("id,luc_number,shop_name,location,completion_status,completed_at,completed_by,pending_fields,last_progress_at,cancellation_reason_id,cancelled_at,cancelled_by").eq("visit_id", visit?.id ?? "").eq("active", true).order("luc_number"), supabase.from("site_survey_visit_environments").select("id,name,template_id,completion_status,completed_at,completed_by,pending_fields,last_progress_at").eq("visit_id", visit?.id ?? "").eq("active", true).order("name"), supabase.from("site_survey_generated_calls").select("id,question_action_id,question_id,visit_luc_id,visit_environment_id,status,internal_call_id,internal_calls(call_number)").eq("visit_id", visit?.id ?? "").eq("status", "aberto")]); return { responses: responses ?? [], attachments: attachments ?? [], logs: logs ?? [], lucHistory: lucHistory ?? [], visitMaterials: visitMaterials ?? [], materialDecisions: materialDecisions ?? [], technicians: technicians ?? [], lucs: lucs ?? [], environments: environments ?? [], generatedCalls: (generatedCalls ?? []) as GeneratedCall[] }; } });
  const points: SurveyPoint[] = [...(detail?.lucs ?? []).map((item) => ({ value: `luc:${item.id}`, label: `LUC ${item.luc_number} — ${item.shop_name}${item.location ? ` — ${item.location}` : ""}`, completionStatus: item.completion_status as "pendente" | "concluida" | "cancelada", templateId: visit?.template_id ?? null })), ...(detail?.environments ?? []).map((item) => ({ value: `environment:${item.id}`, label: item.name, completionStatus: item.completion_status as "pendente" | "concluida", templateId: item.template_id ?? visit?.template_id ?? null }))];
  const pointKind = selectedPoint.startsWith("luc:") ? "luc" : "environment";
  const pointId = selectedPoint.split(":")[1] ?? "";
  const selectedEnvironment = detail?.environments.find((item) => item.id === pointId);
  const selectedPointRecord = pointKind === "luc" ? detail?.lucs.find((item) => item.id === pointId) : selectedEnvironment;
  const selectedPointTemplateId = points.find((point) => point.value === selectedPoint)?.templateId ?? visit?.template_id ?? null;
  const hasOwnEnvironmentTemplate = pointKind === "environment" && Boolean(selectedEnvironment?.template_id);
  const pointSections = sortByPosition(data.sections.filter((section) => section.active && section.template_id === selectedPointTemplateId)).slice(hasOwnEnvironmentTemplate ? 0 : 3);
  const questions = sortByPosition(data.questions.filter((question) => question.active && (generalSections.some((section) => section.id === question.section_id) || pointSections.some((section) => section.id === question.section_id))));
  const selectedPointCancelled = pointKind === "luc" && selectedPointRecord?.completion_status === "cancelada";
  const savedPendingFields = Array.isArray(selectedPointRecord?.pending_fields) ? selectedPointRecord.pending_fields.filter((item): item is string => typeof item === "string") : [];
  const matchesPoint = (item: { visit_luc_id?: string | null; visit_environment_id?: string | null }) => pointKind === "luc" ? item.visit_luc_id === pointId : item.visit_environment_id === pointId;
  const scopedMaterials = (detail?.visitMaterials ?? []).filter(matchesPoint);
  const scopedMaterialDecision = (detail?.materialDecisions ?? []).find(matchesPoint);
  const scopedTechnicians = (detail?.technicians ?? []).filter((item) => !item.visit_luc_id && !item.visit_environment_id);
  useEffect(() => { setOpenSectionId(null); }, [visit?.id]);
  useEffect(() => { setMaterialRows(scopedMaterials.map((item) => ({ catalog_item_id: item.catalog_item_id, quantity: String(item.quantity), notes: item.notes ?? "", screwdriver_type_id: item.screwdriver_type_id ?? "none", wrench_size_id: item.wrench_size_id ?? "none" }))); }, [selectedPoint, detail?.visitMaterials]);
  useEffect(() => { setNoAdditionalMaterial(Boolean(scopedMaterialDecision?.no_additional_material)); }, [selectedPoint, detail?.materialDecisions]);
  useEffect(() => { setSpecialEquipmentAnswer(""); }, [selectedPoint]);
  useEffect(() => { setVisitTechnicians(scopedTechnicians.length ? scopedTechnicians.map((item) => ({ technician_id: item.technician_id, mobile_phone: data.technicians.find((technician) => technician.id === item.technician_id)?.mobile_phone ?? item.mobile_phone })) : [{ technician_id: "", mobile_phone: "" }]); }, [selectedPoint, detail?.technicians, data.technicians]);
  if (!visit) return null;
  const visitClientId = visit.client_id ?? data.projects.find((project) => project.id === visit.project_id)?.client_id ?? null;
  const visitCategory = data.clientCategories.find((category) => category.id === data.clients.find((client) => client.id === visitClientId)?.category_id);
  const isShoppingVisit = visitCategory?.name.trim().toLocaleLowerCase("pt-BR") === "shoppings";
  const phonePattern = /^\+?[0-9 ()-]{8,24}$/;
  const actionScopeKey = (ruleId: string, phase: "pre_visit" | "point") => `${ruleId}:${phase === "pre_visit" ? "general" : selectedPoint}`;
  const generatedCallsForScope = (phase: "pre_visit" | "point") => (detail?.generatedCalls ?? []).filter((item) => phase === "pre_visit" ? !item.visit_luc_id && !item.visit_environment_id : matchesPoint(item));
  const handleQuestionAnswerChange = (question: Question, value: unknown, phase: "pre_visit" | "point") => {
    for (const rule of data.questionActions.filter((item) => item.question_id === question.id)) {
      const key = actionScopeKey(rule.id, phase);
      const alreadyGenerated = generatedCallsForScope(phase).some((item) => item.question_action_id === rule.id);
      if (!answerMatches(value, rule.trigger_value)) {
        setApprovedActionKeys((current) => { const next = new Set(current); next.delete(key); return next; });
        setDeclinedActionKeys((current) => { const next = new Set(current); next.delete(key); return next; });
      } else if (!alreadyGenerated && !approvedActionKeys.has(key) && !declinedActionKeys.has(key)) {
        const actionName = data.actionCatalog.find((item) => item.id === rule.action_id)?.name ?? "Chamado para o suporte";
        setPendingAction({ key, actionName });
      }
    }
  };
  const updateStatus = async (status: VisitStatus) => { if ((status === "em_revisao" || status === "concluida") && !allRequiredComplete) return toast.error("Preencha todos os campos obrigatórios antes de concluir."); const stamps: Record<string, string> = {}; if (status === "em_andamento") stamps.started_at = new Date().toISOString(); if (status === "em_revisao") stamps.submitted_at = new Date().toISOString(); if (status === "concluida") stamps.completed_at = new Date().toISOString(); if (status === "cancelada") stamps.cancelled_at = new Date().toISOString(); const { error } = await supabase.from("site_survey_visits").update({ status, review_notes: reviewNotes || visit.review_notes, ...stamps }).eq("id", visit.id); if (error) return toast.error(error.message); toast.success(`Visita ${STATUS[status].toLocaleLowerCase("pt-BR")}`); onChanged(); };
  const cancelPoint = async () => {
    if (pointKind !== "luc" || !pointId || !cancellationReasonId) return toast.error("Selecione o motivo do cancelamento.");
    setCancellingPoint(true);
    const cancelledAt = new Date().toISOString();
    const { error } = await supabase.from("site_survey_visit_lucs").update({ completion_status: "cancelada", cancellation_reason_id: cancellationReasonId, cancelled_at: cancelledAt, cancelled_by: data.userId, completed_at: null, completed_by: null, updated_by: data.userId }).eq("id", pointId);
    if (error) { setCancellingPoint(false); return toast.error(error.message); }
    const otherPointsFinished = points.filter((point) => point.value !== selectedPoint).every((point) => point.completionStatus === "concluida" || point.completionStatus === "cancelada");
    if (preVisitSaved && otherPointsFinished) {
      const { error: visitError } = await supabase.from("site_survey_visits").update({ status: "em_revisao", submitted_at: cancelledAt }).eq("id", visit.id);
      if (visitError) { setCancellingPoint(false); return toast.error(visitError.message); }
      onChanged();
    }
    setCancellingPoint(false); setCancelPointOpen(false); setCancellationReasonId(""); setOpenSectionId(null);
    await refetchDetail();
    toast.success("Visita da loja cancelada");
  };
  const pointPendingFields = (form: HTMLFormElement, sectionIds?: Set<string>) => {
    const values = new FormData(form);
    const formAnswers = new Map<string, unknown>(questions.map((question) => [question.id, question.question_type === "multiselect" ? values.getAll(question.id).map(String) : question.question_type === "checkbox" ? checkboxUsesOptions(question) ? String(values.get(question.id) ?? "") : values.get(question.id) === "on" : { value: String(values.get(question.id) ?? ""), detail: [String(values.get(`${question.id}__detail`) ?? "").trim(), String(values.get(`${question.id}__subdetail`) ?? "").trim()].filter(Boolean).join(" | ") }]));
    const pending: string[] = [];
    for (const section of pointSections.filter((item) => !sectionIds || sectionIds.has(item.id))) {
      const equipmentQuestion = questions.find((question) => question.section_id === section.id && isSpecialEquipmentQuestion(question));
      if (equipmentQuestion) {
        const equipmentAnswer = answerParts(formAnswers.get(equipmentQuestion.id)).value;
        if (isAffirmativeAnswer(equipmentAnswer) && !materialRows.some((item) => item.catalog_item_id && Number(item.quantity) > 0)) pending.push(`${section.title}: informe ao menos uma ferramenta prevista`);
        continue;
      }
      const applicable = questions.filter((question) => question.section_id === section.id).filter((question) => isQuestionVisible(question, formAnswers));
      for (const question of applicable) {
        const hasExistingPhoto = (detail?.attachments ?? []).some((item) => item.question_id === question.id && matchesPoint(item));
        const photo = values.get(`${question.id}__photo`);
        const attachments = hasExistingPhoto || (photo instanceof File && photo.size > 0) ? [{ question_id: question.id, visit_luc_id: pointKind === "luc" ? pointId : null, visit_environment_id: pointKind === "environment" ? pointId : null }] : [];
        if (!isStoredQuestionComplete(question, formAnswers, attachments, matchesPoint)) pending.push(`${section.title}: ${question.prompt}`);
      }
    }
    return pending;
  };
  const saveAnswers = async (form: HTMLFormElement, phase: "pre_visit" | "point", finishPoint = false, acceptedPendingFields: string[] = []) => {
    if (phase === "point" && !pointId) throw new Error("Selecione a loja ou ambiente deste checklist.");
    const values = new FormData(form);
    const scope = pointKind === "luc" ? { visit_luc_id: pointId, visit_environment_id: null } : { visit_luc_id: null, visit_environment_id: pointId };
    const formAnswers = new Map<string, unknown>(questions.map((question) => [question.id, question.question_type === "multiselect" ? values.getAll(question.id).map(String) : question.question_type === "checkbox" ? checkboxUsesOptions(question) ? String(values.get(question.id) ?? "") : values.get(question.id) === "on" : String(values.get(question.id) ?? "")]));
    const visibleQuestions = questions.filter((question) => phase === "pre_visit"
      ? generalQuestionIds.has(question.id)
      : !generalQuestionIds.has(question.id)).filter((question) => isQuestionVisible(question, formAnswers));
    const rows = visibleQuestions.map((question) => {
      const config = asQuestionConfig(question.configuration);
      const value = question.question_key === "shopping_maintenance_companions" ? visitTechnicians.map((item) => item.technician_id) : question.question_type === "multiselect" ? values.getAll(question.id).map(String) : question.question_type === "checkbox" ? checkboxUsesOptions(question) ? String(values.get(question.id) ?? "") : values.get(question.id) === "on" : String(values.get(question.id) ?? "");
      const baseDetail = String(values.get(`${question.id}__detail`) ?? "").trim();
      const subdetail = String(values.get(`${question.id}__subdetail`) ?? "").trim();
      const detailValue = subdetail ? `${baseDetail} | ${subdetail}` : baseDetail;
       const hasOtherOption = Array.isArray(question.options) && question.options.some((option) => typeof option === "string" && isOtherOption(option));
      const questionScope = phase === "pre_visit" ? { visit_luc_id: null, visit_environment_id: null } : scope;
       return { visit_id: visit.id, ...questionScope, question_id: question.id, answered_by: data.userId, answer: config.detail || config.other_detail || hasOtherOption ? { value, detail: detailValue || null } : value, question_snapshot: JSON.parse(JSON.stringify({ prompt: question.prompt, options: question.options, configuration: question.configuration })) };
    });
    for (const question of visibleQuestions.filter((item) => item.question_key !== "shopping_maintenance_companions")) {
      const photo = values.get(`${question.id}__photo`);
      const isGeneralQuestion = phase === "pre_visit";
      if (photo instanceof File && photo.size > 0) {
        const safe = photo.name.replace(/[^a-zA-Z0-9._-]/g, "-"); const path = `${visit.id}/${isGeneralQuestion ? "geral" : pointId}/${crypto.randomUUID()}-${safe}`;
        const { error: uploadError } = await supabase.storage.from("site-survey-attachments").upload(path, photo); if (uploadError) throw uploadError;
        const attachmentScope = isGeneralQuestion ? { visit_luc_id: null, visit_environment_id: null } : scope;
        const { error } = await supabase.from("site_survey_attachments").insert({ visit_id: visit.id, ...attachmentScope, question_id: question.id, uploaded_by: data.userId, file_name: photo.name, storage_path: path, content_type: photo.type, file_size: photo.size }); if (error) throw error;
      }
    }
    const existingResponses = (detail?.responses ?? []).filter((response) => phase === "pre_visit"
      ? generalQuestionIds.has(response.question_id) && !response.visit_luc_id && !response.visit_environment_id
      : matchesPoint(response));
    await Promise.all(rows.map(async (row) => {
      const existing = existingResponses.find((response) => response.question_id === row.question_id);
      const { error } = existing
        ? await supabase.from("site_survey_responses").update({ answer: row.answer, answered_by: row.answered_by, question_snapshot: row.question_snapshot }).eq("id", existing.id)
        : await supabase.from("site_survey_responses").insert(row as never);
      if (error) throw error;
    }));
    const configuredActions = data.questionActions.filter((rule) => visibleQuestions.some((question) => question.id === rule.question_id));
    if (configuredActions.length) {
      const questionIds = configuredActions.map((rule) => rule.question_id);
      let responseQuery = supabase.from("site_survey_responses").select("id,question_id,answer").eq("visit_id", visit.id).in("question_id", questionIds);
      responseQuery = phase === "pre_visit" ? responseQuery.is("visit_luc_id", null).is("visit_environment_id", null) : pointKind === "luc" ? responseQuery.eq("visit_luc_id", pointId) : responseQuery.eq("visit_environment_id", pointId);
      const { data: savedResponses, error: responseError } = await responseQuery; if (responseError) throw responseError;
      for (const rule of configuredActions) {
        const response = savedResponses?.find((item) => item.question_id === rule.question_id);
        const responseValue = response ? answerParts(response.answer).value : undefined;
        const triggered = answerMatches(responseValue, rule.trigger_value);
        let openCalls = supabase.from("site_survey_generated_calls").select("id,internal_call_id").eq("visit_id", visit.id).eq("question_action_id", rule.id).eq("status", "aberto");
        openCalls = phase === "pre_visit" ? openCalls.is("visit_luc_id", null).is("visit_environment_id", null) : pointKind === "luc" ? openCalls.eq("visit_luc_id", pointId) : openCalls.eq("visit_environment_id", pointId);
        const { data: existingCalls } = await openCalls;
        const actionKey = actionScopeKey(rule.id, phase);
        if (triggered && !existingCalls?.length && approvedActionKeys.has(actionKey)) {
          const question = questions.find((item) => item.id === rule.question_id);
          const action = data.actionCatalog.find((item) => item.id === rule.action_id);
          const pointLabel = phase === "point" ? points.find((item) => item.value === selectedPoint)?.label : null;
          const { data: internalCall, error: callError } = await supabase.from("internal_calls").insert({ category: "problema_campo", title: action?.name ?? "Ação do Site Survey", description: [`Site Survey #${String(visit.survey_number).padStart(12, "0")}`, pointLabel, question?.prompt, `Resposta: ${String(responseValue ?? "")}`].filter(Boolean).join("\n"), priority: "media", reporter_id: data.userId, source: "site_survey", site_survey_visit_id: visit.id, site_survey_question_id: rule.question_id, site_survey_visit_luc_id: phase === "point" && pointKind === "luc" ? pointId : null, site_survey_visit_environment_id: phase === "point" && pointKind === "environment" ? pointId : null }).select("id,call_number").single();
          if (callError) throw callError;
          const { error } = await supabase.from("site_survey_generated_calls").insert({ visit_id: visit.id, question_action_id: rule.id, question_id: rule.question_id, visit_luc_id: phase === "point" && pointKind === "luc" ? pointId : null, visit_environment_id: phase === "point" && pointKind === "environment" ? pointId : null, trigger_value: rule.trigger_value, created_by: data.userId, internal_call_id: internalCall.id }); if (error) throw error;
        }
        if (!triggered && existingCalls?.length) {
          const { error } = await supabase.from("site_survey_generated_calls").update({ status: "cancelado" }).in("id", existingCalls.map((item) => item.id)); if (error) throw error;
          const callIds = existingCalls.map((item) => item.internal_call_id).filter((id): id is string => Boolean(id));
          if (callIds.length) { const { error: callError } = await supabase.from("internal_calls").update({ status: "cancelado" }).in("id", callIds); if (callError) throw callError; }
        }
      }
    }
    if (phase === "pre_visit") {
      const { error: clearTechniciansError } = await supabase.from("site_survey_visit_technicians").delete().eq("visit_id", visit.id).is("visit_luc_id", null).is("visit_environment_id", null); if (clearTechniciansError) throw clearTechniciansError;
       const techniciansToSave = visitTechnicians.filter((item) => item.technician_id && phonePattern.test(item.mobile_phone.trim()));
       if (techniciansToSave.length) { const { error: techniciansError } = await supabase.from("site_survey_visit_technicians").insert(techniciansToSave.map((item) => ({ visit_id: visit.id, visit_luc_id: null, visit_environment_id: null, technician_id: item.technician_id, mobile_phone: item.mobile_phone.trim(), recorded_by: data.userId }))); if (techniciansError) throw techniciansError; }
       toast.success("Progresso do checklist pré-visita salvo");
      setOpenSectionId(null);
    } else {
       const validMaterialRows = materialRows.filter((item) => item.catalog_item_id && Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0);
      let materialDelete = supabase.from("site_survey_visit_materials").delete().eq("visit_id", visit.id); materialDelete = pointKind === "luc" ? materialDelete.eq("visit_luc_id", pointId) : materialDelete.eq("visit_environment_id", pointId); const { error: clearError } = await materialDelete; if (clearError) throw clearError;
       if (validMaterialRows.length) { const { error: materialError } = await supabase.from("site_survey_visit_materials").insert(validMaterialRows.map((item) => ({ visit_id: visit.id, ...scope, catalog_item_id: item.catalog_item_id, quantity: Number(item.quantity), notes: item.notes.trim() || null, screwdriver_type_id: item.screwdriver_type_id === "none" ? null : item.screwdriver_type_id, wrench_size_id: item.wrench_size_id === "none" ? null : item.wrench_size_id, recorded_by: data.userId }))); if (materialError) throw materialError; }
      let decisionDelete = supabase.from("site_survey_material_decisions").delete().eq("visit_id", visit.id); decisionDelete = pointKind === "luc" ? decisionDelete.eq("visit_luc_id", pointId) : decisionDelete.eq("visit_environment_id", pointId); const { error: decisionClearError } = await decisionDelete; if (decisionClearError) throw decisionClearError;
       const { error: decisionError } = await supabase.from("site_survey_material_decisions").insert({ visit_id: visit.id, ...scope, no_additional_material: !needsSpecialEquipment || noAdditionalMaterial, recorded_by: data.userId }); if (decisionError) throw decisionError;
      for (const file of files) { const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-"); const path = `${visit.id}/${pointId}/${crypto.randomUUID()}-${safe}`; const { error: uploadError } = await supabase.storage.from("site-survey-attachments").upload(path, file); if (uploadError) throw uploadError; const { error } = await supabase.from("site_survey_attachments").insert({ visit_id: visit.id, ...scope, uploaded_by: data.userId, file_name: file.name, storage_path: path, content_type: file.type, file_size: file.size }); if (error) throw error; }
       const activeSection = pointSections.find((section) => section.id === openSectionId);
       const activeSectionPending = activeSection ? pointPendingFields(form, new Set([activeSection.id])) : [];
       const previousOtherSectionPending = activeSection
         ? savedPendingFields.filter((field) => !field.startsWith(`${activeSection.title}:`))
         : savedPendingFields;
       const pendingFields = finishPoint
         ? []
         : acceptedPendingFields.length
           ? acceptedPendingFields
           : activeSection
             ? [...previousOtherSectionPending, ...activeSectionPending]
             : savedPendingFields;
       const pointTable = pointKind === "luc" ? "site_survey_visit_lucs" : "site_survey_visit_environments";
       const completedAt = finishPoint ? new Date().toISOString() : null;
       const { error: pointError } = await supabase.from(pointTable).update({ completion_status: finishPoint ? "concluida" : "pendente", completed_at: completedAt, completed_by: finishPoint ? data.userId : null, pending_fields: pendingFields, last_progress_at: new Date().toISOString() }).eq("id", pointId); if (pointError) throw pointError;
        const otherPointsComplete = points.filter((point) => point.value !== selectedPoint).every((point) => point.completionStatus === "concluida" || point.completionStatus === "cancelada");
       if (finishPoint && preVisitSaved && otherPointsComplete) {
         const { error: visitError } = await supabase.from("site_survey_visits").update({ status: "em_revisao", submitted_at: new Date().toISOString() }).eq("id", visit.id); if (visitError) throw visitError;
         toast.success("Todas as lojas foram concluídas. A visita foi enviada para revisão.");
         onChanged();
       } else {
         toast.success(finishPoint ? "Visita desta loja concluída" : pendingFields.length ? "Progresso salvo com pendências registradas" : "Progresso salvo");
       }
        setFiles([]); setOpenSectionId(null);
        if (finishPoint) { setSelectedPoint(""); setPointFilter(""); }
    }
    await refetchDetail();
  };
  const answers = new Map((detail?.responses ?? []).filter((response) => generalQuestionIds.has(response.question_id) ? !response.visit_luc_id && !response.visit_environment_id : matchesPoint(response)).map((response) => [response.question_id, response.answer]));
  const specialEquipmentQuestion = questions.find(isSpecialEquipmentQuestion);
  const storedSpecialEquipmentAnswer = specialEquipmentQuestion ? answerParts(answers.get(specialEquipmentQuestion.id)).value : undefined;
  const needsSpecialEquipment = isAffirmativeAnswer(specialEquipmentAnswer || storedSpecialEquipmentAnswer);
  const sectionPendingCount = (section: Section, general: boolean) => {
    if (!general && questions.some((question) => question.section_id === section.id && isSpecialEquipmentQuestion(question))) return needsSpecialEquipment && materialRows.length === 0 ? 1 : 0;
    const applicableQuestions = questions.filter((question) => question.section_id === section.id).filter((question) => isQuestionVisible(question, answers));
    const scopedAttachments = detail?.attachments ?? [];
    return applicableQuestions.filter((question) => !isStoredQuestionComplete(question, answers, scopedAttachments, general ? (item) => !item.visit_luc_id && !item.visit_environment_id : matchesPoint)).length;
  };
   const sectionHasSavedData = (section: Section, general: boolean) => {
     const questionIds = new Set(questions.filter((question) => question.section_id === section.id).map((question) => question.id));
     const responseSaved = (detail?.responses ?? []).some((response) => questionIds.has(response.question_id)
       && (general ? !response.visit_luc_id && !response.visit_environment_id : matchesPoint(response))
       && hasMeaningfulAnswer(response.answer));
     const photoSaved = (detail?.attachments ?? []).some((attachment) => Boolean(attachment.question_id && questionIds.has(attachment.question_id))
       && (general ? !attachment.visit_luc_id && !attachment.visit_environment_id : matchesPoint(attachment)));
     return responseSaved || photoSaved;
   };
   const sectionVisiblePendingCount = (section: Section, general: boolean) => sectionHasSavedData(section, general) ? sectionPendingCount(section, general) : 0;
    const visibleSavedPendingFields = savedPendingFields.filter((field) => pointSections.some((section) => sectionHasSavedData(section, false) && field.startsWith(`${section.title}:`)));
    const visibleDisplayedPendingFields = pendingPointSave?.fields ?? visibleSavedPendingFields;
    const groupedPendingFields = pointSections.map((section, index) => ({
      label: `Etapa ${generalSections.length + index + 1}`,
      fields: visibleDisplayedPendingFields
        .filter((field) => field.startsWith(`${section.title}:`))
        .map((field) => field.slice(section.title.length + 1).trim()),
    })).filter((group) => group.fields.length > 0);
   const generalChecklistComplete = generalSections.every((section) => sectionPendingCount(section, true) === 0) && visitTechnicians.every((item) => Boolean(item.technician_id) && phonePattern.test(item.mobile_phone.trim()));
   const preVisitSaved = generalQuestionIds.size === 0 || generalChecklistComplete;
   const isPointComplete = (point: { value: string }) => {
     const [kind, id = ""] = point.value.split(":");
     const pointMatches = (item: { visit_luc_id?: string | null; visit_environment_id?: string | null }) => kind === "luc" ? item.visit_luc_id === id : item.visit_environment_id === id;
     const pointAnswers = new Map((detail?.responses ?? []).filter(pointMatches).map((response) => [response.question_id, response.answer]));
     const questionsComplete = pointSections.every((section) => {
        if (questions.some((question) => question.section_id === section.id && isSpecialEquipmentQuestion(question))) return true;
         const applicable = questions.filter((question) => question.section_id === section.id).filter((question) => isQuestionVisible(question, pointAnswers));
       return applicable.every((question) => isStoredQuestionComplete(question, pointAnswers, detail?.attachments ?? [], pointMatches));
     });
     const hasMaterialDecision = (detail?.materialDecisions ?? []).some((item) => pointMatches(item) && item.no_additional_material) || (detail?.visitMaterials ?? []).some(pointMatches);
     return questionsComplete && hasMaterialDecision;
   };
     const allRequiredComplete = preVisitSaved && points.length > 0 && points.every((point) => point.completionStatus === "concluida" || point.completionStatus === "cancelada");
  const renderMaterials = needsSpecialEquipment ? <div className="space-y-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">Ferramentas previstas</p><Button type="button" size="compactIcon" variant="ghost" aria-label="Adicionar ferramenta" title="Adicionar ferramenta" onClick={() => { setNoAdditionalMaterial(false); setMaterialRows((current) => [...current, { catalog_item_id: "", quantity: "1", notes: "", screwdriver_type_id: "none", wrench_size_id: "none" }]); }}><Plus className="h-5 w-5" strokeWidth={2.5} /></Button></div>{materialRows.map((row, index) => { const item = data.catalog.find((entry) => entry.id === row.catalog_item_id); return <div key={`${row.catalog_item_id}-${index}`} className="grid gap-3 sm:grid-cols-[1.4fr_100px_1fr_auto]"><FormSelect name={`material-${index}`} label="Ferramenta" value={row.catalog_item_id || undefined} onChange={(value) => setMaterialRows((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, catalog_item_id: value } : entry))} options={data.catalog.filter((entry) => entry.active && entry.category === "equipamento")} /><LabeledControlled label="Quantidade" type="number" value={row.quantity} onChange={(value) => setMaterialRows((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, quantity: value } : entry))} />{item?.name === "Chave de fenda" ? <FormSelect name={`screwdriver-${index}`} label="Tipo" value={row.screwdriver_type_id} onChange={(value) => setMaterialRows((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, screwdriver_type_id: value } : entry))} options={data.screwdriverTypes} optional /> : item?.name === "Chave de grifo" ? <FormSelect name={`wrench-${index}`} label="Bitola" value={row.wrench_size_id} onChange={(value) => setMaterialRows((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, wrench_size_id: value } : entry))} options={data.wrenchSizes} optional /> : <LabeledControlled label="Observação" value={row.notes} onChange={(value) => setMaterialRows((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, notes: value } : entry))} />}<ConfirmDeleteButton title="Remover ferramenta?" description="A ferramenta será retirada desta OS." onConfirm={async () => setMaterialRows((current) => current.filter((_, itemIndex) => itemIndex !== index))} /></div>; })}{materialRows.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma ferramenta selecionada.</p> : null}</div> : null;
  const generalCalls = new Map(generatedCallsForScope("pre_visit").map((item) => [item.question_id, { id: item.internal_call_id, number: item.internal_calls?.call_number ?? null }]));
  const pointCalls = new Map(generatedCallsForScope("point").map((item) => [item.question_id, { id: item.internal_call_id, number: item.internal_calls?.call_number ?? null }]));
  const phaseForm = (
    <div className="space-y-5">
    <form onSubmit={(event) => { event.preventDefault(); void saveAnswers(event.currentTarget, "pre_visit").catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Não foi possível salvar o checklist pré-visita.")); }} className="space-y-5">
      {generalSections.map((section, index) => <ChecklistSection key={section.id} section={section} order={index + 1} open={openSectionId === section.id} pendingCount={sectionVisiblePendingCount(section, true)} onToggle={() => setOpenSectionId((current) => current === section.id ? null : section.id)}><ConditionalSectionQuestions sectionTitle={section.title} questions={questions.filter((question) => question.section_id === section.id)} answers={answers} attachments={detail?.attachments ?? []} matchesPoint={(item) => !item.visit_luc_id && !item.visit_environment_id} selectedPoint="general" pendingFields={[]} calls={generalCalls} onQuestionAnswerChange={(question, value) => handleQuestionAnswerChange(question, value, "pre_visit")} technicians={data.technicians} visitTechnicians={visitTechnicians} onTechniciansChange={setVisitTechnicians} /></ChecklistSection>)}
       <div className="flex justify-end"><Button type="submit"><ClipboardCheck className="h-4 w-4" />Salvar progresso</Button></div>
    </form>
    {preVisitSaved ? (
    <form onSubmit={(event) => { event.preventDefault(); void saveAnswers(event.currentTarget, "point").catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Não foi possível salvar a vistoria.")); }} className="space-y-5">
       <div className="space-y-2 border-t pt-5"><Label>Loja ou ambiente deste checklist</Label><Popover open={pointPickerOpen} onOpenChange={setPointPickerOpen}><PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" aria-expanded={pointPickerOpen} aria-label="Selecionar Loja ou ambiente deste checklist" className="h-11 w-full justify-between !bg-background px-3 font-normal !text-foreground hover:!bg-muted hover:!text-foreground"> <span className={selectedPoint ? "truncate" : "truncate text-muted-foreground"}>{selectedPoint ? points.find((point) => point.value === selectedPoint)?.label : "Selecione ou pesquise o LUC ou nome da loja"}</span><ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" /></Button></PopoverTrigger><PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0"><Command><CommandInput value={pointFilter} onValueChange={setPointFilter} placeholder="Digite o LUC ou nome da loja" /><CommandList><CommandEmpty>Nenhuma loja encontrada.</CommandEmpty><CommandGroup>{points.map((point) => <CommandItem key={point.value} value={point.label} onSelect={() => { setSelectedPoint(point.value); setPointFilter(""); setPointPickerOpen(false); setOpenSectionId(null); }}><Check className={`h-4 w-4 ${selectedPoint === point.value ? "opacity-100" : "opacity-0"}`} /><span className="min-w-0 flex-1 truncate">{point.label}</span><Badge variant="outline" className="shrink-0">{point.completionStatus === "concluida" ? "Concluída" : point.completionStatus === "cancelada" ? "Cancelada" : "Não concluída"}</Badge></CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent></Popover>{selectedPoint ? <Badge variant="outline" className="w-fit">{points.find((point) => point.value === selectedPoint)?.completionStatus === "concluida" ? "Loja concluída" : selectedPointCancelled ? "Loja cancelada" : "Visita da loja não concluída"}</Badge> : null}{!points.length ? <p className="text-sm text-destructive">Cadastre ao menos uma loja ou ambiente antes de preencher o checklist.</p> : null}</div>
          {selectedPoint && !selectedPointCancelled ? pointSections.map((section, index) => <ChecklistSection key={`${selectedPoint}-${section.id}`} section={section} order={generalSections.length + index + 1} open={openSectionId === section.id} pendingCount={sectionVisiblePendingCount(section, false)} onToggle={() => setOpenSectionId((current) => current === section.id ? null : section.id)}>{section.title.startsWith("Revisão") && visibleDisplayedPendingFields.length ? <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3"><p className="text-sm font-semibold text-destructive">Pendências {pendingPointSave ? "encontradas" : "do último salvamento"}</p><div className="mt-3 space-y-3 text-sm text-destructive">{groupedPendingFields.map((group) => <div key={group.label}><p className="font-semibold">{group.label}</p><ul className="mt-1 space-y-1">{group.fields.map((field) => <li key={field}>• {field}</li>)}</ul></div>)}</div></div> : section.title.startsWith("Revisão") && selectedPointRecord?.last_progress_at ? <p className="text-sm text-muted-foreground">Nenhuma pendência de preenchimento registrada.</p> : null}<ConditionalSectionQuestions sectionTitle={section.title} questions={questions.filter((question) => question.section_id === section.id)} answers={answers} attachments={detail?.attachments ?? []} matchesPoint={matchesPoint} selectedPoint={selectedPoint} pendingFields={sectionHasSavedData(section, false) ? visibleSavedPendingFields : []} calls={pointCalls} onQuestionAnswerChange={(question, value) => { if (isSpecialEquipmentQuestion(question)) { const affirmative = isAffirmativeAnswer(value); setSpecialEquipmentAnswer(affirmative ? "sim" : "não"); setNoAdditionalMaterial(!affirmative); if (!affirmative) setMaterialRows([]); } handleQuestionAnswerChange(question, value, "point"); }} />{questions.some((question) => question.section_id === section.id && isSpecialEquipmentQuestion(question)) ? renderMaterials : null}</ChecklistSection>) : null}
      {questions.length === 0 ? <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">O checklist será disponibilizado quando as perguntas forem cadastradas.</div> : null}
       {!selectedPointCancelled ? <div className="space-y-2"><Label htmlFor="survey-files" className="flex items-center gap-2"><Camera className="h-4 w-4" />Fotos e anexos deste ambiente</Label><Input id="survey-files" type="file" accept="image/*,application/pdf" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></div> : null}
         {!selectedPointCancelled ? <div className="flex flex-wrap justify-end gap-2"><Button type="submit" disabled={!selectedPoint}><ClipboardCheck className="h-4 w-4" />Salvar progresso</Button><Button type="button" variant="outline" disabled={!selectedPoint} onClick={(event) => { const form = event.currentTarget.form; if (!form) return; const fields = pointPendingFields(form); if (fields.length) { setOpenSectionId(pointSections.find((section) => section.title.startsWith("Revisão"))?.id ?? null); setPendingPointSave({ form, fields }); } else void saveAnswers(form, "point", true).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Não foi possível concluir a visita desta loja.")); }}><Check className="h-4 w-4" />Concluir visita</Button>{pointKind === "luc" ? <Button type="button" variant="destructive" disabled={!selectedPoint} onClick={() => setCancelPointOpen(true)}><X className="h-4 w-4" />Cancelar visita</Button> : null}</div> : null}
    </form>
    ) : null}
      <AlertDialog open={cancelPointOpen} onOpenChange={(open) => { if (!cancellingPoint) { setCancelPointOpen(open); if (!open) setCancellationReasonId(""); } }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Cancelar visita desta loja?</AlertDialogTitle><AlertDialogDescription>As respostas, fotos, anexos e o histórico já registrados serão preservados.</AlertDialogDescription></AlertDialogHeader><div className="space-y-2"><Label>Motivo do cancelamento</Label><Select value={cancellationReasonId || undefined} onValueChange={setCancellationReasonId}><SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger><SelectContent>{data.cancellationReasons.map((reason) => <SelectItem key={reason.id} value={reason.id}>{reason.name}</SelectItem>)}</SelectContent></Select></div><AlertDialogFooter><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={!cancellationReasonId || cancellingPoint} onClick={(event) => { event.preventDefault(); void cancelPoint(); }}>{cancellingPoint ? "Cancelando..." : "Confirmar cancelamento"}</AlertDialogAction><AlertDialogCancel disabled={cancellingPoint}>Voltar</AlertDialogCancel></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
  return <section className="mt-5 space-y-5 rounded-md border border-border bg-card p-4 shadow-sm sm:p-6" aria-label={`Detalhes da visita ${String(visit.survey_number).padStart(12, "0")}`}><header className="border-b border-border pb-4"><h2 className="text-lg font-bold">Site Survey #{String(visit.survey_number).padStart(12, "0")}</h2><p className="mt-1 text-sm text-muted-foreground"><MapPin className="mr-1 inline h-3.5 w-3.5" />{visit.address}</p></header><div className="grid gap-3 sm:grid-cols-3"><Info label="Situação" value={STATUS[visit.status]} /><Info label="Agendamento" value={new Date(visit.scheduled_start).toLocaleString("pt-BR")} /><Info label="Técnico" value={data.technicians.find((item) => item.id === visit.technician_id)?.full_name ?? "—"} /></div>{isShoppingVisit ? <div className="space-y-3"><SiteSurveyLucManager visitId={visit.id} userId={data.userId} canImport={data.permissions.has("site_survey_agendar") || data.permissions.has("site_survey_editar")} canEdit={data.permissions.has("site_survey_agendar") || data.permissions.has("site_survey_editar") || data.permissions.has("site_survey_executar")} onChanged={() => void refetchDetail()} /><SiteSurveyEnvironmentManager visitId={visit.id} userId={data.userId} canEdit={data.permissions.has("site_survey_agendar") || data.permissions.has("site_survey_editar") || data.permissions.has("site_survey_executar")} templates={data.templates} compact onChanged={() => void refetchDetail()} /></div> : <SiteSurveyEnvironmentManager visitId={visit.id} userId={data.userId} canEdit={data.permissions.has("site_survey_agendar") || data.permissions.has("site_survey_editar") || data.permissions.has("site_survey_executar")} templates={data.templates} onChanged={() => void refetchDetail()} />}{(detail?.lucHistory.length ?? 0) > 0 ? <section className="space-y-2 border-t pt-5"><h3 className="font-bold">Histórico anterior do LUC</h3><div className="divide-y rounded-md border">{detail?.lucHistory.map((entry) => <div key={entry.id} className="grid gap-1 p-3 text-sm sm:grid-cols-[120px_1fr_180px]"><span className="font-medium">LUC {entry.luc_number}</span><span>{entry.shop_name}</span><span className="text-muted-foreground">{new Date(entry.valid_from).toLocaleString("pt-BR")}</span></div>)}</div></section> : null}<div className="flex flex-wrap gap-2">{visit.status === "agendada" && data.permissions.has("site_survey_executar") ? <Button size="sm" onClick={() => updateStatus("em_andamento")}><Check className="h-4 w-4" />Iniciar visita</Button> : null}</div>{visit.status === "em_andamento" && data.permissions.has("site_survey_executar") ? phaseForm : null}<AlertDialog open={Boolean(pendingPointSave)} onOpenChange={(open) => { if (!open) setPendingPointSave(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Existem campos pendentes</AlertDialogTitle><AlertDialogDescription>Preencha os itens abaixo para concluir esta loja. Se preferir, salve agora e continue depois.</AlertDialogDescription></AlertDialogHeader><div className="max-h-64 overflow-y-auto rounded-md border p-3"><ul className="space-y-1 text-sm text-destructive">{pendingPointSave?.fields.map((field) => <li key={field}>• {field}</li>)}</ul></div><AlertDialogFooter><AlertDialogAction onClick={() => { const pending = pendingPointSave; setPendingPointSave(null); if (pending) void saveAnswers(pending.form, "point", false, pending.fields).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Não foi possível salvar as pendências.")); }}>Salvar com pendências</AlertDialogAction><AlertDialogCancel>Continuar preenchendo</AlertDialogCancel></AlertDialogFooter></AlertDialogContent></AlertDialog><AlertDialog open={Boolean(pendingAction)} onOpenChange={(open) => { if (!open && pendingAction) { setDeclinedActionKeys((current) => new Set(current).add(pendingAction.key)); setPendingAction(null); } }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Abrir chamado para o suporte?</AlertDialogTitle><AlertDialogDescription>A resposta selecionada gera a ação “{pendingAction?.actionName}”. Confirme para abrir o chamado ao salvar o andamento.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { if (!pendingAction) return; setApprovedActionKeys((current) => new Set(current).add(pendingAction.key)); setPendingAction(null); }}>Confirmar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>{(detail?.attachments.length ?? 0) > 0 ? <section className="space-y-2 border-t pt-5"><h3 className="font-bold">Anexos</h3><div className="flex flex-wrap gap-2">{detail?.attachments.filter(matchesPoint).map((attachment) => <AttachmentThumbnail key={attachment.id} attachment={attachment} />)}</div></section> : null}{visit.status === "em_revisao" && data.permissions.has("site_survey_revisar") ? <section className="space-y-3 border-t pt-5"><Label htmlFor="review-notes">Observações da revisão</Label><Textarea id="review-notes" value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} /><div className="flex flex-wrap gap-2"><Button disabled={!allRequiredComplete} onClick={() => updateStatus("concluida")}><Check className="h-4 w-4" />Concluir</Button><Button variant="outline" onClick={() => updateStatus("em_andamento")}><Pencil className="h-4 w-4" />Solicitar ajustes</Button></div>{!allRequiredComplete ? <p className="text-sm text-destructive">A conclusão será liberada quando todas as lojas estiverem concluídas.</p> : null}</section> : null}{visit.status === "concluida" && data.permissions.has("site_survey_revisar") ? <Button variant="outline" onClick={() => updateStatus("em_andamento")}><Pencil className="h-4 w-4" />Reabrir visita</Button> : null}</section>;
}

function ConditionalSectionQuestions({ sectionTitle, questions, answers, attachments, matchesPoint, selectedPoint, pendingFields, calls, onQuestionAnswerChange, technicians, visitTechnicians, onTechniciansChange }: { sectionTitle: string; questions: Question[]; answers: Map<string, unknown>; attachments: SurveyAttachment[]; matchesPoint: (item: { visit_luc_id?: string | null; visit_environment_id?: string | null }) => boolean; selectedPoint: string; pendingFields: string[]; calls: Map<string, { id: string | null; number: string | null }>; onQuestionAnswerChange: (question: Question, value: unknown) => void; technicians?: Profile[]; visitTechnicians?: VisitTechnician[]; onTechniciansChange?: (rows: VisitTechnician[]) => void }) {
  const [liveAnswers, setLiveAnswers] = useState<Map<string, unknown>>(() => new Map(answers));
  const savedAnswersSignature = JSON.stringify([...answers.entries()]);
  useEffect(() => {
    setLiveAnswers(new Map(answers));
  }, [savedAnswersSignature, selectedPoint]);
  const visibleQuestions = questions.filter((question) => isQuestionVisible(question, liveAnswers));
  return <>{visibleQuestions.map((question) => question.question_key === "shopping_maintenance_companions" && technicians && visitTechnicians && onTechniciansChange ? <TechnicianSelector key={question.id} technicians={technicians} rows={visitTechnicians} onChange={onTechniciansChange} /> : <QuestionField key={`${selectedPoint}-${question.id}-${JSON.stringify(answers.get(question.id))}`} question={question} answer={answers.get(question.id)} attachments={attachments.filter((item) => item.question_id === question.id && matchesPoint(item))} pending={pendingFields.includes(`${sectionTitle}: ${question.prompt}`)} call={calls.get(question.id)} onAnswerChange={(value) => { setLiveAnswers((current) => new Map(current).set(question.id, value)); onQuestionAnswerChange(question, value); }} />)}</>;
}

function TechnicianSelector({ technicians, rows, onChange }: { technicians: Profile[]; rows: VisitTechnician[]; onChange: (rows: VisitTechnician[]) => void }) {
  return <div className="space-y-3"><div className="flex items-center justify-between gap-3"><Label className="text-sm font-semibold">Técnicos</Label><Button type="button" size="sm" variant="outline" onClick={() => onChange([...rows, { technician_id: "", mobile_phone: "" }])}><Plus className="h-4 w-4" />Técnico</Button></div>{rows.map((row, index) => <div key={index} className="grid items-end gap-3 sm:grid-cols-[1fr_220px_auto]"><FormSelect name={`visit-technician-${index}`} label="Técnico cadastrado" value={row.technician_id || undefined} onChange={(value) => { const technician = technicians.find((item) => item.id === value); onChange(rows.map((item, itemIndex) => itemIndex === index ? { ...item, technician_id: value, mobile_phone: technician?.mobile_phone ?? "" } : item)); }} options={technicians.map((item) => ({ id: item.id, name: item.full_name || item.email || "Técnico" }))} /><div className="space-y-2"><Label>Celular</Label><Input value={row.mobile_phone} readOnly placeholder="Cadastre no myio RH" className="bg-muted/40" aria-label={`Celular de ${technicians.find((item) => item.id === row.technician_id)?.full_name ?? "técnico"}`} />{row.technician_id && !row.mobile_phone ? <p className="text-xs text-destructive">Celular pendente no myio RH.</p> : null}</div>{rows.length > 1 ? <ConfirmDeleteButton title="Remover técnico?" description="O técnico será retirado desta OS." onConfirm={async () => onChange(rows.filter((_, itemIndex) => itemIndex !== index))} /> : <span />}</div>)}</div>;
}

function EmptyTemplatePicker({ templates, open, collapsed, onOpenChange, onSelect, onToggle }: { templates: Template[]; open: boolean; collapsed: boolean; onOpenChange: (open: boolean) => void; onSelect: (id: string) => void; onToggle: () => void }) {
  return <Card><CardHeader className="pb-2"><div className="flex items-start justify-between gap-3"><div className="space-y-1"><CardTitle>Editar modelo</CardTitle><CardDescription>Selecione e atualize um roteiro existente.</CardDescription></div><Button type="button" size="compactIcon" variant="ghost" className="text-myio-green hover:text-myio-green" aria-label={collapsed ? "Exibir edição de modelo" : "Recolher edição de modelo"} title={collapsed ? "Exibir" : "Recolher"} onClick={onToggle}>{collapsed ? <Plus className="h-5 w-5" strokeWidth={2.5} /> : <Minus className="h-5 w-5" strokeWidth={2.5} />}</Button></div></CardHeader>{collapsed ? null : <CardContent className="pb-3"><Popover open={open} onOpenChange={onOpenChange}><PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between !bg-card text-foreground hover:!bg-muted sm:w-56"><span className="truncate text-muted-foreground">Selecione um modelo</span><ChevronDown className="h-4 w-4 shrink-0 opacity-60" /></Button></PopoverTrigger><PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start"><Command><CommandInput placeholder="Buscar modelo..." /><CommandList><CommandEmpty>Nenhum modelo encontrado.</CommandEmpty><CommandGroup>{templates.map((template) => <CommandItem key={template.id} value={template.name} onSelect={() => onSelect(template.id)} className="flex justify-between gap-3"><span>{template.name}</span>{template.is_default ? <Badge>Padrão</Badge> : null}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent></Popover></CardContent>}</Card>;
}

function ChecklistAdmin({ data, onChanged }: { data: NonNullable<ReturnType<typeof useSurveyDataShape>>; onChanged: () => void }) {
  const activeTemplates = data.templates.filter((item) => item.active);
  const [selected, setSelected] = useState("");
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [sectionOrder, setSectionOrder] = useState<string[]>([]);
  const [questionOrders, setQuestionOrders] = useState<Record<string, string[]>>({});
  const [addingQuestionSectionId, setAddingQuestionSectionId] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<Set<string>>(() => new Set());
  const [collapsedAdminBlocks, setCollapsedAdminBlocks] = useState<Set<"new" | "edit" | "sections">>(() => new Set(["new", "edit", "sections"]));
  const toggleAdminBlock = (block: "new" | "edit" | "sections") => setCollapsedAdminBlocks((current) => { const next = new Set(current); if (next.has(block)) next.delete(block); else next.add(block); return next; });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  useEffect(() => {
    if (selected && !activeTemplates.some((item) => item.id === selected)) setSelected("");
  }, [activeTemplates, selected]);
  useEffect(() => {
    const sections = sortByPosition(data.sections.filter((item) => item.active && item.template_id === selected));
    setSectionOrder(sections.map((item) => item.id));
    setQuestionOrders(Object.fromEntries(sections.map((section) => [section.id, sortByPosition(data.questions.filter((item) => item.active && item.section_id === section.id)).map((item) => item.id)])));
  }, [data.sections, data.questions, selected]);
  const createTemplate = async (form: HTMLFormElement) => { const values = new FormData(form); const name = String(values.get("name")).trim(); const description = String(values.get("description")).trim(); if (!name || name.length > 50) return toast.error("O nome do modelo deve ter entre 1 e 50 caracteres."); if (description.length > 100) return toast.error("A descrição deve ter no máximo 100 caracteres."); const { error } = await supabase.from("site_survey_templates").insert({ name, description: description || null, created_by: data.userId }); if (error) return toast.error(error.message); toast.success("Modelo criado"); form.reset(); onChanged(); };
  const createSection = async (form: HTMLFormElement) => { if (!selected) return; const values = new FormData(form); const title = String(values.get("title")).trim(); const description = String(values.get("description")).trim(); if (!title || title.length > 50) return toast.error("O título da seção deve ter entre 1 e 50 caracteres."); if (description.length > 100) return toast.error("A descrição deve ter no máximo 100 caracteres."); const { error } = await supabase.from("site_survey_sections").insert({ template_id: selected, title, description: description || null, position: sectionOrder.length }); if (error) return toast.error(error.message); toast.success("Seção adicionada"); form.reset(); onChanged(); };
  const createQuestion = async (form: HTMLFormElement, sectionId: string) => { const values = new FormData(form); const prompt = String(values.get("prompt")).trim(); if (!prompt || prompt.length > 50) return toast.error("A pergunta deve ter entre 1 e 50 caracteres."); const options = String(values.get("options") ?? "").split(/[;\n]/).map((item) => item.trim()).filter(Boolean); const conditioned = values.get("conditioned") === "on"; const actionEnabled = values.get("generate_action") === "on"; const result = await supabase.from("site_survey_questions").insert({ section_id: sectionId, prompt, question_type: String(values.get("question_type")), required: values.get("required") === "on", options, configuration: questionConfigurationFromForm(values), position: questionOrders[sectionId]?.length ?? 0, conditioned_on_question_id: conditioned ? String(values.get("condition_question") || "") || null : null, conditioned_operator: conditioned ? String(values.get("condition_operator") || "equals") : "equals", conditioned_value: conditioned ? String(values.get("condition_value") || "") || null : null }).select("id").single(); if (result.error) return toast.error(result.error.message); if (actionEnabled) { const actionId = String(values.get("action_id") || ""); const triggerValue = String(values.get("action_trigger") || "").trim(); if (actionId && triggerValue) { const { error } = await supabase.from("site_survey_question_actions").insert({ question_id: result.data.id, action_id: actionId, trigger_value: triggerValue }); if (error) return toast.error(error.message); } } toast.success("Pergunta adicionada"); form.reset(); setAddingQuestionSectionId(null); onChanged(); };
  const updateTemplate = async (form: HTMLFormElement, id: string) => { const values = new FormData(form); const name = String(values.get("name")).trim(); const description = String(values.get("description")).trim(); if (!name || name.length > 50) return toast.error("O nome do modelo deve ter entre 1 e 50 caracteres."); if (description.length > 100) return toast.error("A descrição deve ter no máximo 100 caracteres."); const { error } = await supabase.from("site_survey_templates").update({ name, description: description || null }).eq("id", id); if (error) return toast.error(error.message); toast.success("Modelo atualizado"); onChanged(); };
  const updateSection = async (form: HTMLFormElement, id: string) => { const values = new FormData(form); const title = String(values.get("title")).trim(); const description = String(values.get("description")).trim(); if (!title || title.length > 50) return toast.error("O título da seção deve ter entre 1 e 50 caracteres."); if (description.length > 100) return toast.error("A descrição deve ter no máximo 100 caracteres."); const { error } = await supabase.from("site_survey_sections").update({ title, description: description || null }).eq("id", id); if (error) return toast.error(error.message); toast.success("Seção atualizada"); setEditingSectionId(null); onChanged(); };
  const updateQuestion = async (form: HTMLFormElement, question: Question) => { const values = new FormData(form); const prompt = String(values.get("prompt")).trim(); if (!prompt || prompt.length > 50) return toast.error("A pergunta deve ter entre 1 e 50 caracteres."); const options = String(values.get("options") ?? "").split(/[;\n]/).map((item) => item.trim()).filter(Boolean); const conditioned = values.get("conditioned") === "on"; const { error } = await supabase.from("site_survey_questions").update({ prompt, question_type: String(values.get("question_type")), required: values.get("required") === "on", options, configuration: questionConfigurationFromForm(values, asQuestionConfig(question.configuration)), conditioned_on_question_id: conditioned ? String(values.get("condition_question") || "") || null : null, conditioned_operator: conditioned ? String(values.get("condition_operator") || "equals") : "equals", conditioned_value: conditioned ? String(values.get("condition_value") || "") || null : null }).eq("id", question.id); if (error) return toast.error(error.message); await supabase.from("site_survey_question_actions").delete().eq("question_id", question.id); if (values.get("generate_action") === "on") { const actionId = String(values.get("action_id") || ""); const triggerValue = String(values.get("action_trigger") || "").trim(); if (actionId && triggerValue) { const actionResult = await supabase.from("site_survey_question_actions").insert({ question_id: question.id, action_id: actionId, trigger_value: triggerValue }); if (actionResult.error) return toast.error(actionResult.error.message); } } toast.success("Pergunta atualizada"); setEditingQuestionId(null); onChanged(); };
  const persistOrder = async (table: "site_survey_sections" | "site_survey_questions", ids: string[]) => { const results = await Promise.all(ids.map((id, position) => supabase.from(table).update({ position }).eq("id", id))); const failed = results.find((result) => result.error); if (failed?.error) throw failed.error; };
  const reorderSections = async ({ active, over }: DragEndEvent) => { if (!over || active.id === over.id) return; const oldOrder = sectionOrder; const from = oldOrder.indexOf(String(active.id)); const to = oldOrder.indexOf(String(over.id)); if (from < 0 || to < 0) return; const next = arrayMove(oldOrder, from, to); setSectionOrder(next); try { await persistOrder("site_survey_sections", next); toast.success("Seções reordenadas"); onChanged(); } catch (error) { setSectionOrder(oldOrder); toast.error(error instanceof Error ? error.message : "Não foi possível reordenar as seções."); } };
  const reorderQuestions = async (sectionId: string, { active, over }: DragEndEvent) => { const dropZone = document.getElementById(`question-drop-zone-${sectionId}`); const translated = active.rect.current.translated; if (!over || active.id === over.id || !dropZone || !translated) return; const bounds = dropZone.getBoundingClientRect(); const centerX = translated.left + translated.width / 2; const centerY = translated.top + translated.height / 2; if (centerX < bounds.left || centerX > bounds.right || centerY < bounds.top || centerY > bounds.bottom) return; const oldOrder = questionOrders[sectionId] ?? []; const from = oldOrder.indexOf(String(active.id)); const to = oldOrder.indexOf(String(over.id)); if (from < 0 || to < 0) return; const next = arrayMove(oldOrder, from, to); setQuestionOrders((current) => ({ ...current, [sectionId]: next })); try { await persistOrder("site_survey_questions", next); toast.success("Perguntas reordenadas"); onChanged(); } catch (error) { setQuestionOrders((current) => ({ ...current, [sectionId]: oldOrder })); toast.error(error instanceof Error ? error.message : "Não foi possível reordenar as perguntas."); } };
  const deactivate = async (table: "site_survey_templates" | "site_survey_sections" | "site_survey_questions", id: string) => { const { error } = await supabase.from(table).update({ active: false }).eq("id", id); if (error) return toast.error(error.message); if (table === "site_survey_templates") setSelected(""); toast.success("Cadastro excluído"); onChanged(); };
  const selectedTemplate = activeTemplates.find((item) => item.id === selected);
  const sectionsById = new Map(data.sections.map((item) => [item.id, item]));
  const questionsById = new Map(data.questions.map((item) => [item.id, item]));
  return <div className="space-y-4"><Card><CardHeader className="pb-2"><div className="flex items-start justify-between gap-3"><div className="space-y-1"><CardTitle>Novo modelo</CardTitle><CardDescription>Cadastre um novo roteiro de vistoria.</CardDescription></div><Button type="button" size="compactIcon" variant="ghost" className="text-myio-green hover:text-myio-green" aria-label={collapsedAdminBlocks.has("new") ? "Exibir novo modelo" : "Recolher novo modelo"} title={collapsedAdminBlocks.has("new") ? "Exibir" : "Recolher"} onClick={() => toggleAdminBlock("new")}>{collapsedAdminBlocks.has("new") ? <Plus className="h-5 w-5" strokeWidth={2.5} /> : <Minus className="h-5 w-5" strokeWidth={2.5} />}</Button></div></CardHeader>{collapsedAdminBlocks.has("new") ? null : <CardContent className="pb-3"><form onSubmit={(event) => { event.preventDefault(); void createTemplate(event.currentTarget); }} className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><LineField name="name" label="Nome do modelo" required maxLength={50} showCounter compact /><LineField name="description" label="Descrição" maxLength={100} showCounter compact /><Button type="submit" size="compactIcon" variant="ghost" className="mb-5 text-myio-green hover:text-myio-green" aria-label="Criar modelo" title="Criar modelo"><Plus className="h-5 w-5" strokeWidth={2.5} /></Button></form></CardContent>}</Card><div className="space-y-4">{selectedTemplate ? <div key={selectedTemplate.id} className="space-y-4"><Card><CardHeader className="pb-2"><div className="flex items-start justify-between gap-3"><div className="space-y-1"><CardTitle>Editar modelo</CardTitle><CardDescription>Selecione e atualize um roteiro existente.</CardDescription></div><Button type="button" size="compactIcon" variant="ghost" className="text-myio-green hover:text-myio-green" aria-label={collapsedAdminBlocks.has("edit") ? "Exibir edição de modelo" : "Recolher edição de modelo"} title={collapsedAdminBlocks.has("edit") ? "Exibir" : "Recolher"} onClick={() => toggleAdminBlock("edit")}>{collapsedAdminBlocks.has("edit") ? <Plus className="h-5 w-5" strokeWidth={2.5} /> : <Minus className="h-5 w-5" strokeWidth={2.5} />}</Button></div></CardHeader>{collapsedAdminBlocks.has("edit") ? null : <CardContent className="space-y-3 pb-3"><Popover open={templatePickerOpen} onOpenChange={setTemplatePickerOpen}><PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" aria-expanded={templatePickerOpen} className="w-full justify-between !bg-card text-foreground hover:!bg-muted sm:w-56"><span className="truncate">{selectedTemplate.name}{selectedTemplate.is_default ? " — Padrão" : ""}</span><ChevronDown className="h-4 w-4 shrink-0 opacity-60" /></Button></PopoverTrigger><PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start"><Command><CommandInput placeholder="Buscar modelo..." /><CommandList><CommandEmpty>Nenhum modelo encontrado.</CommandEmpty><CommandGroup>{activeTemplates.map((template) => <CommandItem key={template.id} value={template.name} onSelect={() => { setSelected(template.id); setTemplatePickerOpen(false); }} className="flex justify-between gap-3"><span>{template.name}</span>{template.is_default ? <Badge>Padrão</Badge> : null}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent></Popover><form onSubmit={(event) => { event.preventDefault(); void updateTemplate(event.currentTarget, selectedTemplate.id); }} className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><LineField name="name" label="Nome" defaultValue={selectedTemplate.name} required active maxLength={50} showCounter compact /><LineField name="description" label="Descrição" defaultValue={selectedTemplate.description ?? ""} active maxLength={100} showCounter compact /><div className="mb-5 flex items-end gap-2"><Button type="submit" size="compactIcon" variant="outline" aria-label="Salvar modelo" title="Salvar modelo"><Save className="h-3.5 w-3.5" /></Button><ConfirmDeleteButton title={`Excluir ${selectedTemplate.name}?`} description="O modelo deixará de aparecer em novas OS. O histórico existente será preservado." onConfirm={() => deactivate("site_survey_templates", selectedTemplate.id)} /></div></form></CardContent>}</Card><Card><CardHeader className="pb-2"><div className="flex items-start justify-between gap-3"><div className="space-y-1"><CardTitle>Seções do checklist</CardTitle><CardDescription>Arraste os blocos pelo marcador para reorganizar a sequência.</CardDescription></div><Button type="button" size="compactIcon" variant="ghost" className="text-myio-green hover:text-myio-green" aria-label={collapsedAdminBlocks.has("sections") ? "Exibir cadastro de seção" : "Recolher cadastro de seção"} title={collapsedAdminBlocks.has("sections") ? "Exibir" : "Recolher"} onClick={() => toggleAdminBlock("sections")}>{collapsedAdminBlocks.has("sections") ? <Plus className="h-5 w-5" strokeWidth={2.5} /> : <Minus className="h-5 w-5" strokeWidth={2.5} />}</Button></div></CardHeader>{collapsedAdminBlocks.has("sections") ? null : <CardContent className="pb-3"><form onSubmit={(event) => { event.preventDefault(); void createSection(event.currentTarget); }} className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><LineField name="title" label="Título da seção" required maxLength={50} showCounter compact /><LineField name="description" label="Descrição" maxLength={100} showCounter compact /><Button type="submit" size="compactIcon" variant="ghost" className="mb-5 text-myio-green hover:text-myio-green" aria-label="Adicionar seção" title="Adicionar seção"><Plus className="h-5 w-5" strokeWidth={2.5} /></Button></form></CardContent>}</Card><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => void reorderSections(event)}><SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}><div className="space-y-3 sm:space-y-5">{sectionOrder.map((sectionId, sectionIndex) => { const section = sectionsById.get(sectionId); if (!section) return null; const questionIds = questionOrders[section.id] ?? []; const editingSection = editingSectionId === section.id; return <SortableSectionCard key={section.id} id={section.id} order={sectionIndex + 1}><CardHeader className="bg-myio-green/10 px-4 py-3"><form onSubmit={(event) => { event.preventDefault(); void updateSection(event.currentTarget, section.id); }} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] sm:gap-3"><div className="row-span-2 space-y-1 sm:row-span-1 sm:space-y-2"><Label className="block text-left text-base font-bold leading-tight sm:text-lg">Seção</Label><OrderHandle order={sectionIndex + 1} label={`Mover seção ${section.title}`} compact /></div><LineField id={`section-title-${section.id}`} name="title" label="Título" defaultValue={section.title} required ariaLabel="Título da seção" hideLabel sectionAligned maxLength={50} showCounter compact readOnly={!editingSection} active={editingSection} /><LineField name="description" label="Descrição" defaultValue={section.description ?? ""} sectionAligned maxLength={100} showCounter compact readOnly={!editingSection} active={editingSection} /><div className="col-span-2 mt-1 flex items-end gap-2 sm:col-span-1 sm:mt-13"><Button type="button" size="compactIcon" variant="ghost" aria-label="Editar seção" title="Editar seção" onClick={() => setEditingSectionId(section.id)}><Pencil className="h-3.5 w-3.5" /></Button><Button type="submit" size="compactIcon" variant="outline" disabled={!editingSection} aria-label="Salvar seção" title="Salvar seção"><Save className="h-3.5 w-3.5" /></Button><ConfirmDeleteButton title={`Excluir ${section.title}?`} description="A seção e suas perguntas deixarão de aparecer em novas OS." onConfirm={() => deactivate("site_survey_sections", section.id)} /><Button type="button" size="compactIcon" variant="ghost" className="text-myio-green hover:text-myio-green" aria-label={`${collapsedSectionIds.has(section.id) ? "Exibir" : "Recolher"} perguntas da seção ${section.title}`} title={collapsedSectionIds.has(section.id) ? "Exibir perguntas" : "Recolher perguntas"} onClick={() => setCollapsedSectionIds((current) => { const next = new Set(current); if (next.has(section.id)) next.delete(section.id); else next.add(section.id); return next; })}>{collapsedSectionIds.has(section.id) ? <Plus className="h-5 w-5" strokeWidth={2.5} /> : <Minus className="h-5 w-5" strokeWidth={2.5} />}</Button></div></form></CardHeader>{collapsedSectionIds.has(section.id) ? null : <CardContent className="flex flex-col border-t border-border p-0 sm:p-0"><div className="flex min-h-16 items-center justify-between gap-3 border-b border-border px-4 py-3"><h3 className="text-left text-lg font-bold">Perguntas</h3><Button type="button" size="compactIcon" variant="ghost" className="border-0 text-myio-green shadow-none hover:bg-myio-green/10 hover:text-myio-green" aria-label="Adicionar pergunta" title="Adicionar pergunta" onClick={() => setAddingQuestionSectionId(section.id)}><Plus className="h-5 w-5" strokeWidth={3} /></Button></div><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => void reorderQuestions(section.id, event)}><SortableContext items={questionIds} strategy={verticalListSortingStrategy}><div id={`question-drop-zone-${section.id}`} className="divide-y divide-border">{questionIds.map((questionId, questionIndex) => { const question = questionsById.get(questionId); if (!question) return null; const editing = editingQuestionId === question.id; return <SortableQuestionRow key={question.id} id={question.id}><form onSubmit={(event) => { event.preventDefault(); void updateQuestion(event.currentTarget, question); }} className="grid items-end gap-3 p-3 sm:grid-cols-[auto_minmax(220px,1.3fr)_minmax(160px,.7fr)_minmax(200px,1fr)_auto] sm:p-4"><OrderHandle order={questionIndex + 1} label={`Mover pergunta ${question.prompt}`} compact /><QuestionPromptLine name="prompt" defaultValue={question.prompt} editing={editing} ariaLabel={`Texto da pergunta ${questionIndex + 1}`} /><div className="space-y-1"><Select name="question_type" defaultValue={question.question_type} disabled={!editing}><SelectTrigger className={`h-10 rounded-none border-0 border-b bg-transparent px-0 shadow-none focus:ring-0 ${editing ? "border-myio-green" : "border-border"}`} aria-label={`Tipo de resposta da pergunta ${questionIndex + 1}`}><SelectValue /></SelectTrigger><SelectContent><QuestionTypeOptions /></SelectContent></Select><div className="h-8" aria-hidden="true" /></div><div className="space-y-1"><Input className={`h-10 min-w-0 rounded-none border-0 border-b bg-transparent px-0 shadow-none focus-visible:ring-0 ${editing ? "border-myio-green focus-visible:border-myio-green" : "border-border"}`} name="options" defaultValue={(Array.isArray(question.options) ? question.options : []).join("; ")} placeholder="Opções separadas por ponto e vírgula" aria-label={`Opções da pergunta ${questionIndex + 1}`} readOnly={!editing} /><div className="h-8" aria-hidden="true" /></div><div className="space-y-1"><div className="flex h-10 items-end justify-end gap-2"><label className="flex h-6 shrink-0 items-center gap-2 text-sm"><Checkbox name="required" defaultChecked={question.required} disabled={!editing} /><span>{questionRequiresPhoto(question) ? "Foto obrigatória" : "Obrigatória"}</span></label><Button type="button" size="compactIcon" variant="ghost" aria-label="Editar pergunta" title="Editar pergunta" onClick={() => setEditingQuestionId(question.id)}><Pencil className="h-3.5 w-3.5" /></Button><Button type="submit" size="compactIcon" variant="outline" disabled={!editing} aria-label="Salvar pergunta" title="Salvar pergunta"><Save className="h-3.5 w-3.5" /></Button><ConfirmDeleteButton title="Excluir pergunta?" description="A pergunta deixará de aparecer em novas OS; respostas anteriores serão preservadas." onConfirm={() => deactivate("site_survey_questions", question.id)} /></div><div className="h-8" aria-hidden="true" /></div><QuestionRuleFields question={question} priorQuestions={questionIds.slice(0, questionIndex).map((id) => questionsById.get(id)).filter((item): item is Question => Boolean(item))} actions={data.actionCatalog.filter((item) => item.active)} questionAction={data.questionActions.find((item) => item.question_id === question.id)} disabled={!editing} /></form></SortableQuestionRow>; })}</div></SortableContext></DndContext>{addingQuestionSectionId === section.id ? <form onSubmit={(event) => { event.preventDefault(); void createQuestion(event.currentTarget, section.id); }} className="order-first grid items-end gap-3 border-b border-border p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-[40px_minmax(220px,1.3fr)_minmax(160px,.7fr)_minmax(200px,1fr)_auto]"><div className="hidden h-18 w-10 lg:block" aria-hidden="true" /><QuestionPromptLine name="prompt" label="Nova pergunta" editing /><div className="space-y-1"><Label>Tipo de resposta</Label><Select name="question_type" defaultValue="radio"><SelectTrigger className="h-10 rounded-none border-0 border-b border-myio-green bg-transparent px-0 shadow-none focus:ring-0"><SelectValue /></SelectTrigger><SelectContent><QuestionTypeOptions /></SelectContent></Select><div className="h-8" aria-hidden="true" /></div><LineField name="options" label="Opções" placeholder="Ex.: Sim; Não; Não se aplica" active /><div className="space-y-1"><Label className="invisible" aria-hidden="true">Ações</Label><div className="flex h-10 items-end justify-end gap-2"><label className="flex h-6 shrink-0 items-center gap-2 text-sm"><Checkbox name="required" />Obrigatória</label><Button type="submit" size="compactIcon" variant="ghost" className="text-myio-green hover:text-myio-green" aria-label="Adicionar pergunta" title="Adicionar pergunta"><Plus className="h-5 w-5" strokeWidth={2.5} /></Button></div><div className="h-8" aria-hidden="true" /></div><QuestionRuleFields priorQuestions={questionIds.map((id) => questionsById.get(id)).filter((item): item is Question => Boolean(item))} actions={data.actionCatalog.filter((item) => item.active)} /></form> : null}</CardContent>}</SortableSectionCard>; })}</div></SortableContext></DndContext></div> : <EmptyTemplatePicker templates={activeTemplates} open={templatePickerOpen} collapsed={collapsedAdminBlocks.has("edit")} onOpenChange={setTemplatePickerOpen} onSelect={(id) => { setSelected(id); setTemplatePickerOpen(false); }} onToggle={() => toggleAdminBlock("edit")} />}</div></div>;
}

function QuestionTypeOptions() {
  return <><SelectItem value="checkbox">Caixa de seleção</SelectItem><SelectItem value="radio">Escolha única</SelectItem><SelectItem value="multiselect">Múltipla escolha</SelectItem><SelectItem value="text">Texto curto</SelectItem><SelectItem value="textarea">Texto longo</SelectItem><SelectItem value="number">Número</SelectItem><SelectItem value="select">Lista de opções</SelectItem></>;
}

function QuestionRuleFields({ question, priorQuestions, actions, questionAction, disabled = false }: { question?: Question; priorQuestions: Question[]; actions: SurveyAction[]; questionAction?: QuestionAction; disabled?: boolean }) {
  const [conditioned, setConditioned] = useState(Boolean(question?.conditioned_on_question_id));
  const [generateAction, setGenerateAction] = useState(Boolean(questionAction));
  const existingPhoto = asQuestionConfig(question?.configuration).photo;
  const [photoEnabled, setPhotoEnabled] = useState(Boolean(existingPhoto));
  const [photoRequired, setPhotoRequired] = useState(Boolean(existingPhoto?.required));
  return <div className="col-span-full -mt-2 grid gap-1 sm:-mt-5 lg:grid-cols-[40px_minmax(220px,1.3fr)_minmax(160px,.7fr)_minmax(200px,1fr)_auto]">
    <div className="flex w-full flex-wrap items-center justify-end gap-x-6 gap-y-2 lg:col-start-5">
      <label className="flex items-center gap-2 text-sm font-medium"><Checkbox name="photo_enabled" checked={photoEnabled} disabled={disabled} onCheckedChange={(checked) => { const enabled = checked === true; setPhotoEnabled(enabled); if (!enabled) setPhotoRequired(false); }} />Foto</label>
      <label className="flex items-center gap-2 text-sm font-medium"><Checkbox name="conditioned" checked={conditioned} disabled={disabled || priorQuestions.length === 0} onCheckedChange={(checked) => setConditioned(checked === true)} />Condicionar</label>
      <label className="flex items-center gap-2 text-sm font-medium"><Checkbox name="generate_action" checked={generateAction} disabled={disabled || actions.length === 0} onCheckedChange={(checked) => setGenerateAction(checked === true)} />Gerar ação</label>
    </div>
    {photoEnabled || conditioned || generateAction ? <div className="col-span-full grid w-full gap-2 pt-1 sm:grid-cols-2">
      {photoEnabled ? <div className="grid gap-2 sm:grid-cols-2"><label className="flex items-center gap-2 self-end pb-3 text-sm font-medium"><Checkbox name="photo_required" checked={photoRequired} disabled={disabled} onCheckedChange={(checked) => setPhotoRequired(checked === true)} />Foto obrigatória</label>{photoRequired ? <LabeledInput name="photo_required_when" label="Obrigatória quando a resposta for" defaultValue={existingPhoto?.required_when ?? ""} placeholder="Em branco: sempre; opções com ; significam ou" /> : <div />}</div> : <div />}
      {conditioned ? <div className="grid gap-2 sm:grid-cols-3"><div className="space-y-1"><Label>Pergunta anterior</Label><Select name="condition_question" defaultValue={question?.conditioned_on_question_id ?? undefined} disabled={disabled}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{priorQuestions.map((item) => <SelectItem key={item.id} value={item.id}>{item.prompt}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>Condição</Label><Select name="condition_operator" defaultValue={question?.conditioned_operator ?? "equals"} disabled={disabled}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="equals">Exibir quando for</SelectItem><SelectItem value="not_equals">Exibir quando não for</SelectItem></SelectContent></Select></div><LabeledInput name="condition_value" label="Resposta" defaultValue={question?.conditioned_value ?? ""} required={!disabled} /></div> : <div />}
      {generateAction ? <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label>Ação</Label><Select name="action_id" defaultValue={questionAction?.action_id} disabled={disabled}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{actions.map((action) => <SelectItem key={action.id} value={action.id}>{action.name}</SelectItem>)}</SelectContent></Select></div><LabeledInput name="action_trigger" label="Quando a resposta for" defaultValue={questionAction?.trigger_value ?? ""} required={!disabled} /></div> : null}
    </div> : null}
  </div>;
}

function QuestionPromptLine({ name, defaultValue = "", label, editing = false, ariaLabel }: { name: string; defaultValue?: string; label?: string; editing?: boolean; ariaLabel?: string }) {
  const [value, setValue] = useState(defaultValue.slice(0, 50));
  return <div className="min-w-0 space-y-1">{label ? <Label>{label}</Label> : null}<Input name={name} value={value} onChange={(event) => setValue(event.target.value.slice(0, 50))} maxLength={50} required readOnly={!editing} aria-label={ariaLabel ?? label ?? "Texto da pergunta"} placeholder="Digite a pergunta" className={`h-10 min-w-0 rounded-none border-0 border-b bg-transparent px-0 shadow-none focus-visible:ring-0 ${editing ? "border-myio-green focus-visible:border-myio-green" : "border-border"}`} /><div className="flex min-h-8 items-start justify-between gap-2 text-[11px] leading-tight text-muted-foreground"><span>Redija a pergunta ou frase do check List.</span><span className="shrink-0 tabular-nums">{value.length}/50</span></div></div>;
}

function LineField({ name, label, defaultValue = "", placeholder, required = false, id, ariaLabel, hideLabel = false, active = false, sectionAligned = false, maxLength, showCounter = false, compact = false, readOnly = false }: { name: string; label: string; defaultValue?: string; placeholder?: string; required?: boolean; id?: string; ariaLabel?: string; hideLabel?: boolean; active?: boolean; sectionAligned?: boolean; maxLength?: number; showCounter?: boolean; compact?: boolean; readOnly?: boolean }) {
  const initialValue = maxLength ? defaultValue.slice(0, maxLength) : defaultValue;
  const [length, setLength] = useState(initialValue.length);
  return <div onReset={() => setLength(0)} className={`min-w-0 ${sectionAligned ? compact ? "space-y-0.5 sm:space-y-2" : "space-y-2 sm:space-y-4" : compact ? "space-y-1" : "space-y-2"}`}><Label htmlFor={id} className={hideLabel ? "text-[11px] font-bold uppercase sm:invisible" : undefined} aria-hidden={hideLabel || undefined}>{label}</Label><Input id={id} name={name} defaultValue={initialValue} onInput={(event) => setLength(event.currentTarget.value.length)} maxLength={maxLength} placeholder={placeholder} required={required} readOnly={readOnly} aria-label={ariaLabel ?? label} className={`${sectionAligned ? "h-8 sm:h-10" : "h-10"} min-w-0 rounded-none border-0 border-b bg-transparent px-0 shadow-none focus-visible:border-myio-green focus-visible:ring-0 ${active ? "border-myio-green" : "border-border"}`} />{showCounter && maxLength ? <div className={`${sectionAligned ? "h-3 sm:h-4" : "h-4"} flex justify-end text-[11px] text-muted-foreground`}><span className="tabular-nums">{length}/{maxLength}</span></div> : <div className={compact ? "h-4" : "h-8"} aria-hidden="true" />}</div>;
}

function SortableSectionCard({ id, children }: { id: string; order: number; children: ReactNode }) {
  const sortable = useSortable({ id });
  return <Card ref={sortable.setNodeRef} style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }} className={`overflow-hidden ${sortable.isDragging ? "relative z-20 border-myio-green/50 shadow-lg" : ""}`}><SortableHandleContext.Provider value={{ attributes: sortable.attributes, listeners: sortable.listeners }}>{children}</SortableHandleContext.Provider></Card>;
}

const SortableHandleContext = createContext<{ attributes: ReturnType<typeof useSortable>["attributes"]; listeners: ReturnType<typeof useSortable>["listeners"] } | null>(null);

function SortableQuestionRow({ id, children }: { id: string; children: ReactNode }) {
  const sortable = useSortable({ id });
  return <div ref={sortable.setNodeRef} style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }} className={`border-t border-border first:border-t-0 ${sortable.isDragging ? "relative z-20 bg-card shadow-lg" : ""}`}><SortableHandleContext.Provider value={{ attributes: sortable.attributes, listeners: sortable.listeners }}>{children}</SortableHandleContext.Provider></div>;
}

function OrderHandle({ order, label, compact = false, variant = "section" }: { order: number; label: string; compact?: boolean; variant?: "section" | "question" }) {
  const sortable = useContext(SortableHandleContext);
  const markerClassName = variant === "question"
    ? "bg-myio-green/10 text-myio-green hover:bg-myio-green/20 hover:text-myio-green"
    : "bg-myio-green text-primary-foreground hover:bg-myio-green hover:text-primary-foreground";
  return <div className={`flex w-10 flex-col items-start gap-1 ${compact ? "self-start" : "self-start sm:pt-7"}`}><Button type="button" variant="ghost" className={`h-10 w-10 cursor-grab p-0 font-bold active:cursor-grabbing touch-none ${markerClassName}`} aria-label={label} title="Arrastar" {...sortable?.attributes} {...sortable?.listeners}><span className="tabular-nums">{order}</span></Button><span className="w-16 text-left text-[10px] leading-tight text-muted-foreground">Arrastar</span></div>;
}

function SurveyCatalogAdmin({ data, onChanged }: { data: NonNullable<ReturnType<typeof useSurveyDataShape>>; onChanged: () => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [itemDialog, setItemDialog] = useState<string | null>(null);
  const [newCatalogOpen, setNewCatalogOpen] = useState(false);
  const lists = [
    { key: "catalog", title: "Materiais e equipamentos", table: "site_survey_material_catalog", items: data.catalog },
    { key: "screwdriver", title: "Tipos de chave de fenda", table: "site_survey_screwdriver_types", items: data.screwdriverTypes },
    { key: "wrench", title: "Bitolas de chave de grifo", table: "site_survey_wrench_sizes", items: data.wrenchSizes },
    { key: "actions", title: "Ações para chamados", table: "site_survey_action_catalog", items: data.actionCatalog },
    { key: "cancellation-reasons", title: "Motivos de cancelamento de Loja/LUC", table: "site_survey_cancellation_reasons", items: data.cancellationReasons },
    ...data.customCatalogs.map((catalog) => ({ key: `custom:${catalog.id}`, title: catalog.name, table: "site_survey_custom_catalog_items", items: catalog.site_survey_custom_catalog_items.filter((item) => item.active).sort((left, right) => left.position - right.position || left.name.localeCompare(right.name, "pt-BR")), customCatalogId: catalog.id })),
  ];
  const toggle = (key: string) => setExpanded((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const addItem = async (form: HTMLFormElement, list: (typeof lists)[number]) => {
    const values = new FormData(form);
    const name = String(values.get("name") ?? "").trim();
    if (!name || name.length > 120) return toast.error("Informe um nome com até 120 caracteres.");
    const payload = list.table === "site_survey_material_catalog" ? { name, category: String(values.get("category")) } : list.table === "site_survey_action_catalog" ? { name, description: String(values.get("description") ?? "").trim() || null } : list.table === "site_survey_custom_catalog_items" ? { name, catalog_id: "customCatalogId" in list ? list.customCatalogId : "" } : { name };
    const { error } = await supabase.from(list.table as "site_survey_material_catalog").insert(payload as never);
    if (error) return toast.error(error.code === "23505" ? "Este item já está cadastrado." : error.message);
    toast.success("Item adicionado"); setItemDialog(null); onChanged();
  };
  const addCatalog = async (form: HTMLFormElement) => {
    const name = String(new FormData(form).get("name") ?? "").trim();
    if (name.length < 2 || name.length > 120) return toast.error("Informe um nome entre 2 e 120 caracteres.");
    const { error } = await supabase.from("site_survey_custom_catalogs").insert({ name, created_by: data.userId });
    if (error) return toast.error(error.code === "23505" ? "Este cadastro já existe." : error.message);
    toast.success("Cadastro criado"); setNewCatalogOpen(false); onChanged();
  };
  return <div className="space-y-5">
    <div><h2 className="text-xl font-bold">Cadastro</h2><p className="text-sm text-muted-foreground">Diversos</p></div>
    <Card><CardHeader className="py-4"><div className="flex items-center justify-between gap-3"><CardTitle className="text-base">Novo cadastro</CardTitle><Button type="button" size="compactIcon" variant="ghost" aria-label="Criar novo cadastro" title="Criar novo cadastro" onClick={() => setNewCatalogOpen(true)}><Plus strokeWidth={2.5} /></Button></div></CardHeader></Card>
    <Dialog open={newCatalogOpen} onOpenChange={setNewCatalogOpen}><DialogContent><DialogHeader><DialogTitle>Novo cadastro</DialogTitle><DialogDescription>Crie uma nova lista para o Site Survey.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void addCatalog(event.currentTarget); }}><LabeledInput name="name" label="Nome do cadastro" required /><DialogFooter><Button type="submit">Salvar</Button></DialogFooter></form></DialogContent></Dialog>
    <div className="grid gap-4 lg:grid-cols-2">{lists.map((list) => {
      const open = expanded.has(list.key);
      return <Collapsible key={list.key} open={open} onOpenChange={() => toggle(list.key)} asChild><Card>
        <CardHeader className="py-4"><div className="flex items-center justify-between gap-3"><CardTitle className="min-w-0 text-base">{list.title}</CardTitle><div className="flex shrink-0 items-center gap-2"><Button type="button" size="compactIcon" variant="ghost" aria-label={`Adicionar item em ${list.title}`} title="Adicionar item" onClick={(event) => { event.stopPropagation(); setItemDialog(list.key); }}><Plus strokeWidth={2.5} /></Button><CollapsibleTrigger asChild><Button type="button" size="compactIcon" variant="ghost" aria-label={open ? `Recolher ${list.title}` : `Exibir ${list.title}`} title={open ? "Recolher" : "Exibir"}>{open ? <ChevronDown className="rotate-180" /> : <ChevronDown />}</Button></CollapsibleTrigger></div></div></CardHeader>
        <CollapsibleContent><CardContent className="pb-4"><div className="divide-y rounded-md border">{list.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-2 p-3 text-sm"><span>{item.name}</span><ConfirmDeleteButton title={`Excluir ${item.name}?`} description="A exclusão será bloqueada se o cadastro já estiver vinculado a uma OS." onConfirm={async () => { const { error } = await supabase.from(list.table as "site_survey_material_catalog").delete().eq("id", item.id); if (error) return toast.error(error.message); toast.success("Item excluído"); onChanged(); }} /></div>)}{list.items.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Nenhum item cadastrado.</p> : null}</div>{"customCatalogId" in list ? <div className="mt-4 flex justify-end"><ConfirmDeleteButton title={`Excluir o cadastro ${list.title}?`} description="Esta ação excluirá o cadastro e todos os seus itens." ariaLabel={`Excluir cadastro ${list.title}`} confirmLabel="Excluir" onConfirm={async () => { const { error } = await supabase.from("site_survey_custom_catalogs").delete().eq("id", list.customCatalogId); if (error) return toast.error(error.message); toast.success("Cadastro excluído"); onChanged(); }} /></div> : null}</CardContent></CollapsibleContent>
        <Dialog open={itemDialog === list.key} onOpenChange={(next) => setItemDialog(next ? list.key : null)}><DialogContent><DialogHeader><DialogTitle>Adicionar em {list.title}</DialogTitle><DialogDescription>Informe os dados do novo item.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void addItem(event.currentTarget, list); }}><LabeledInput name="name" label="Nome" required />{list.key === "actions" ? <LabeledInput name="description" label="Descrição" /> : null}{list.key === "catalog" ? <div className="space-y-2"><Label>Categoria</Label><Select name="category" defaultValue="equipamento"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="material">Material</SelectItem><SelectItem value="equipamento">Equipamento</SelectItem></SelectContent></Select></div> : null}<DialogFooter><Button type="submit">Salvar</Button></DialogFooter></form></DialogContent></Dialog>
      </Card></Collapsible>;
    })}</div>
  </div>;
}

function SurveyUsersAdmin() {
  const [userToRemove, setUserToRemove] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const qc = useQueryClient(); const { data } = useQuery({ queryKey: ["site-survey-users-admin"], queryFn: async () => { const [{ data: accesses }, { data: profiles }, { data: definitions }, { data: surveyProfiles }] = await Promise.all([supabase.from("user_app_access").select("user_id").eq("app_key", "site_survey"), supabase.from("profiles").select("id,full_name,email").is("deleted_at", null).order("full_name"), supabase.from("site_survey_access_profiles").select("code,name").eq("active", true).order("name"), supabase.from("site_survey_user_profiles").select("user_id,profile_code,is_customized")]); const ids = new Set((accesses ?? []).map((item) => item.user_id)); return { users: (profiles ?? []).filter((item) => ids.has(item.id)), definitions: definitions ?? [], surveyProfiles: new Map((surveyProfiles ?? []).map((item) => [item.user_id, item])) }; } });
  const setProfile = async (userId: string, profileCode: string) => { const { error } = await supabase.from("site_survey_user_profiles").upsert({ user_id: userId, profile_code: profileCode, is_customized: false }); if (error) return toast.error(error.message); await supabase.from("site_survey_user_permissions").delete().eq("user_id", userId); toast.success("Perfil atualizado"); qc.invalidateQueries({ queryKey: ["site-survey-users-admin"] }); };
  const removeAccess = async () => {
    if (!userToRemove) return;
    setRemoving(true);
    const { error } = await supabase.from("user_app_access").delete().eq("user_id", userToRemove.id).eq("app_key", "site_survey");
    setRemoving(false);
    if (error) return toast.error(error.message);
    setUserToRemove(null);
    toast.success("Acesso ao Site Survey removido");
    await qc.invalidateQueries({ queryKey: ["site-survey-users-admin"] });
  };
  return <Card><CardHeader><CardTitle>Usuários</CardTitle><CardDescription>Atribua um perfil do Site Survey aos usuários liberados no portal.</CardDescription></CardHeader><CardContent className="space-y-2">{data?.users.map((user) => <div key={user.id} className="grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_280px_auto] sm:items-center"><div className="min-w-0"><p className="truncate font-medium">{user.full_name || "Sem nome"}</p><p className="truncate text-xs text-muted-foreground">{user.email}</p></div><div className="flex min-w-0 items-center gap-2"><Select value={data.surveyProfiles.get(user.id)?.profile_code ?? "tecnico"} onValueChange={(value) => void setProfile(user.id, value)}><SelectTrigger className="min-w-0 flex-1"><SelectValue /></SelectTrigger><SelectContent>{data.definitions.map((profile) => <SelectItem key={profile.code} value={profile.code}>{profile.name}</SelectItem>)}</SelectContent></Select><Button type="button" variant="ghost" size="compactIcon" aria-label={`Remover ${user.full_name || "usuário"} do Site Survey`} title="Remover acesso" onClick={() => setUserToRemove({ id: user.id, name: user.full_name || user.email || "este usuário" })}><Trash2 className="h-4 w-4" /></Button></div></div>)}<AlertDialog open={Boolean(userToRemove)} onOpenChange={(open) => { if (!open && !removing) setUserToRemove(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover acesso ao Site Survey?</AlertDialogTitle><AlertDialogDescription>Esta ação removerá o acesso de {userToRemove?.name} somente ao Site Survey. A conta e os acessos aos demais aplicativos serão mantidos.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={removing} onClick={(event) => { event.preventDefault(); void removeAccess(); }}>{removing ? "Excluindo..." : "Excluir"}</AlertDialogAction><AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel></AlertDialogFooter></AlertDialogContent></AlertDialog></CardContent></Card>;
}

function SurveyLogs({ names }: { names: { clients: Map<string, string>; projects: Map<string, string>; technicians: Map<string, string> } }) {
  const { data = [] } = useQuery({ queryKey: ["site-survey-logs"], queryFn: async () => { const { data, error } = await supabase.from("site_survey_logs").select("*,site_survey_visits(survey_number,technician_id,client_id,project_id)").order("created_at", { ascending: false }).limit(300); if (error) throw error; return data; } });
  return <Card><CardHeader><CardTitle>Logs</CardTitle><CardDescription>Histórico das alterações nas visitas.</CardDescription></CardHeader><CardContent className="divide-y">{data.map((log) => { const visit = log.site_survey_visits as { survey_number: number; technician_id: string; client_id: string | null; project_id: string | null } | null; return <div key={log.id} className="grid gap-1 py-3 text-sm sm:grid-cols-[160px_160px_1fr]"><span>{new Date(log.created_at).toLocaleString("pt-BR")}</span><span>Survey {String(visit?.survey_number ?? 0).padStart(12, "0")}</span><span>{log.action.replaceAll("_", " ")} · {names.clients.get(visit?.client_id ?? "") ?? names.projects.get(visit?.project_id ?? "") ?? names.technicians.get(visit?.technician_id ?? "")}</span></div>; })}{!data.length ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum evento registrado.</p> : null}</CardContent></Card>;
}

function asQuestionConfig(value: unknown): QuestionConfig { return value && typeof value === "object" ? value as QuestionConfig : {}; }
function questionOptions(question: Question) { return Array.isArray(question.options) ? question.options.filter((item): item is string => typeof item === "string") : []; }
function checkboxUsesOptions(question: Question) { return question.question_type === "checkbox" && questionOptions(question).length > 1; }
function answerParts(answer: unknown): { value: unknown; detail: string } { if (answer && typeof answer === "object" && !Array.isArray(answer) && "value" in answer) { const stored = answer as { value: unknown; detail?: unknown }; return { value: stored.value, detail: typeof stored.detail === "string" ? stored.detail : "" }; } return { value: answer, detail: "" }; }
function hasMeaningfulAnswer(answer: unknown) {
  const { value, detail } = answerParts(answer);
  const hasValue = Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== "" && value !== false;
  return hasValue || Boolean(detail.trim());
}
function answerMatches(value: unknown, expected: string) {
  const expectedValues = expected.split(";").map((item) => item.trim().toLocaleLowerCase("pt-BR")).filter(Boolean);
  const actualValues = (Array.isArray(value) ? value : [value]).map((item) => String(item ?? "").trim().toLocaleLowerCase("pt-BR"));
  return expectedValues.some((item) => actualValues.includes(item));
}
function isQuestionVisible(question: Question, answers: Map<string, unknown>) {
  if (!question.conditioned_on_question_id || !question.conditioned_value) return true;
  const matches = answerMatches(answerParts(answers.get(question.conditioned_on_question_id)).value, question.conditioned_value);
  return question.conditioned_operator === "not_equals" ? !matches : matches;
}
function isStoredQuestionComplete(question: Question, answers: Map<string, unknown>, attachments: Array<{ question_id: string | null; visit_luc_id?: string | null; visit_environment_id?: string | null }>, matchesScope: (item: { visit_luc_id?: string | null; visit_environment_id?: string | null }) => boolean) {
  const config = asQuestionConfig(question.configuration);
  const stored = answerParts(answers.get(question.id));
  const value = stored.value;
  const hasValue = Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== "" && value !== false;
  const hasRequiredPhoto = attachments.some((item) => item.question_id === question.id && matchesScope(item));
  const photoRequired = questionRequiresPhoto(question, value);
  if (config.photo_only) return photoRequired ? hasRequiredPhoto : true;
  if (!hasValue) return !question.required;
  const applies = config.condition?.value === undefined || (Array.isArray(value) ? value.includes(config.condition.value) : value === config.condition.value);
  const options = Array.isArray(question.options) ? question.options.filter((option): option is string => typeof option === "string") : [];
  const otherApplies = (config.other_detail === true || options.some(isOtherOption)) && (Array.isArray(value) ? value.some((item) => isOtherOption(String(item))) : isOtherOption(String(value)));
  const [detail, subdetail] = stored.detail.split(" | ");
  if (applies && config.detail?.required && !detail?.trim()) return false;
  if (otherApplies && !detail?.trim()) return false;
  if (applies && detail && config.detail?.suboptions?.[detail]?.length && !subdetail?.trim()) return false;
  if (applies && photoRequired && !hasRequiredPhoto) return false;
  return true;
}
function AttachmentThumbnail({ attachment }: { attachment: SurveyAttachment }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const { data: signedUrl } = useQuery({
    queryKey: ["site-survey-attachment-preview", attachment.storage_path],
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("site-survey-attachments").createSignedUrl(attachment.storage_path, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  const isImage = attachment.content_type?.startsWith("image/") ?? /\.(jpe?g|png|webp|gif|heic)$/i.test(attachment.file_name);
  if (!isImage) return <Button type="button" variant="ghost" size="sm" className="h-auto max-w-full justify-start !bg-transparent px-0 text-xs text-foreground hover:!bg-muted" disabled={!signedUrl} onClick={() => signedUrl && window.open(signedUrl, "_blank", "noopener,noreferrer")}><FileText className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{attachment.file_name}</span></Button>;
  return <>
    <Button type="button" variant="ghost" className="group relative h-24 w-24 overflow-hidden !bg-transparent p-0 hover:!bg-muted sm:h-28 sm:w-28" disabled={!signedUrl} aria-label={`Ampliar foto ${attachment.file_name}`} title={attachment.file_name} onClick={(event) => { event.preventDefault(); event.stopPropagation(); setPreviewOpen(true); }}>
      {signedUrl ? <img src={signedUrl} alt={attachment.file_name} loading="lazy" draggable={false} className="pointer-events-none h-full w-full select-none object-cover transition-transform group-hover:scale-105" /> : <Camera className="h-6 w-6 text-muted-foreground" />}
    </Button>
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <DialogContent className="max-h-[88dvh] w-[calc(100vw-2rem)] max-w-4xl overflow-hidden p-3 sm:p-4">
        <DialogTitle className="sr-only">{attachment.file_name}</DialogTitle>
        {signedUrl ? <img src={signedUrl} alt={attachment.file_name} draggable={false} className="mx-auto max-h-[78dvh] w-auto max-w-full select-none rounded-md object-contain" /> : null}
      </DialogContent>
    </Dialog>
  </>;
}

function QuestionField({ question, answer, attachments, pending = false, call, onAnswerChange }: { question: Question; answer: unknown; attachments: SurveyAttachment[]; pending?: boolean; call?: { id: string | null; number: string | null }; onAnswerChange?: (value: unknown) => void }) {
  const options = questionOptions(question);
  const config = asQuestionConfig(question.configuration); const stored = answerParts(answer); const storedValues = Array.isArray(stored.value) ? stored.value.map(String) : [];
  const [storedDetail, storedSubdetail] = stored.detail.split(" | ");
  const [selectedDetail, setSelectedDetail] = useState(storedDetail ?? "");
  const [selectedValue, setSelectedValue] = useState(typeof stored.value === "string" ? stored.value : stored.value === true ? options.find((option) => option.toLocaleLowerCase("pt-BR") === "sim") ?? "" : "");
  const [selectedValues, setSelectedValues] = useState(storedValues);
  const suboptions = config.detail?.suboptions?.[selectedDetail] ?? [];
  const hasPhoto = attachments.length > 0;
  const conditionApplies = config.condition?.value === undefined || selectedValue === config.condition.value || selectedValues.includes(config.condition.value);
  const currentAnswer = question.question_type === "multiselect" ? selectedValues : checkboxUsesOptions(question) ? selectedValue : question.question_type === "checkbox" ? stored.value : selectedValue;
  const photoRequired = questionRequiresPhoto(question, currentAnswer);
   const hasOtherOption = options.some(isOtherOption);
   const showOtherDetail = (config.other_detail === true || hasOtherOption) && (isOtherOption(selectedValue) || selectedValues.some(isOtherOption));
  const showDetail = (Boolean(config.detail) && conditionApplies) || showOtherDetail;
  const setAnswer = (value: string) => { setSelectedValue(value); onAnswerChange?.(value); };
  return <div className={`grid gap-3 py-1 ${showDetail || (config.photo && conditionApplies) ? "lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)] lg:items-start lg:gap-5" : ""}`}>
    <div className="min-w-0 space-y-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2"><Label className={`text-sm font-semibold ${pending ? "text-destructive" : ""}`}>{question.prompt.replace(/\s*\*\s*$/, "")}</Label>{call?.id && call.number ? <Link to="/chamados" search={{ chamado: call.id }} aria-label={`Abrir histórico do chamado ${call.number}`}><Badge variant="outline" className="cursor-pointer border-myio-green/30 bg-myio-green/10 text-myio-green hover:bg-myio-green/20">Chamado #{call.number}</Badge></Link> : null}</div>
       {!config.photo_only ? <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
      {question.question_type === "checkbox" && checkboxUsesOptions(question) ? <RadioGroup name={question.id} value={selectedValue || undefined} onValueChange={setAnswer} className="flex min-h-9 flex-wrap items-center gap-x-6 gap-y-2">{options.map((option) => <label key={option} className="flex shrink-0 items-center gap-2 text-sm"><RadioGroupItem value={option} />{option}</label>)}</RadioGroup> : null}
      {question.question_type === "checkbox" && !checkboxUsesOptions(question) ? <label className="flex items-center gap-2 text-sm"><Checkbox name={question.id} defaultChecked={stored.value === true} onCheckedChange={(checked) => onAnswerChange?.(checked === true)} />Sim</label> : null}
      {question.question_type === "radio" ? <RadioGroup name={question.id} value={selectedValue || undefined} onValueChange={setAnswer} className="flex min-h-9 flex-wrap items-center gap-x-6 gap-y-2">{options.map((option) => <label key={option} className="flex shrink-0 items-center gap-2 text-sm"><RadioGroupItem value={option} />{option}</label>)}</RadioGroup> : null}
      {question.question_type === "multiselect" ? <div className="flex min-h-9 flex-wrap items-center gap-x-6 gap-y-2">{options.map((option) => <label key={option} className="flex shrink-0 items-center gap-2 text-sm"><Checkbox name={question.id} value={option} checked={selectedValues.includes(option)} onCheckedChange={(checked) => setSelectedValues((current) => { const next = checked ? [...current, option] : current.filter((item) => item !== option); onAnswerChange?.(next); return next; })} />{option}</label>)}</div> : null}
      {question.question_type === "select" ? <Select name={question.id} value={selectedValue || undefined} onValueChange={setAnswer}><SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select> : null}
      {question.question_type === "textarea" ? <Textarea name={question.id} defaultValue={typeof stored.value === "string" ? stored.value : ""} onChange={(event) => onAnswerChange?.(event.target.value)} className="min-w-64 flex-1" rows={2} /> : null}
      {question.question_type === "text" || question.question_type === "number" ? <Input name={question.id} type={question.question_type === "number" ? "number" : "text"} defaultValue={typeof stored.value === "string" || typeof stored.value === "number" ? String(stored.value) : ""} onChange={(event) => onAnswerChange?.(event.target.value)} className="min-w-56 flex-1" /> : null}
       </div> : null}
    </div>
    {showDetail || (config.photo && conditionApplies) ? <div className="min-w-0 space-y-3">
       {showDetail ? <div className="min-w-64 flex-1 space-y-2"><Label className="text-xs text-muted-foreground">{showOtherDetail ? "Especifique" : config.detail?.label ?? "Detalhes"}</Label>{config.detail?.options?.length && !showOtherDetail ? <Select name={`${question.id}__detail`} value={selectedDetail || undefined} onValueChange={setSelectedDetail}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{config.detail.options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select> : <Textarea name={`${question.id}__detail`} defaultValue={stored.detail} rows={2} maxLength={500} required={showOtherDetail || config.detail?.required === true} />}{suboptions.length ? <div className="space-y-2"><Label className="text-xs text-muted-foreground">Localização da tomada</Label><Select name={`${question.id}__subdetail`} defaultValue={storedSubdetail || undefined}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{suboptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div> : null}</div> : null}
       {config.photo && conditionApplies ? <div className="min-w-64 flex-1 space-y-2"><Label htmlFor={`${question.id}__photo`} className="flex items-center gap-2 text-xs text-muted-foreground"><Camera className="h-4 w-4" />Foto{photoRequired ? " obrigatória" : " opcional"}{hasPhoto ? " · anexada" : ""}</Label><Input id={`${question.id}__photo`} name={`${question.id}__photo`} type="file" accept="image/*" capture="environment" />{hasPhoto ? <div className="flex flex-wrap gap-2" aria-label="Fotos anexadas">{attachments.map((attachment) => <AttachmentThumbnail key={attachment.id} attachment={attachment} />)}</div> : null}</div> : null}
    </div> : null}
  </div>;
}

function FormSelect({ name, label, options, defaultValue, value, onChange, optional = false }: { name: string; label: string; options: Named[]; defaultValue?: string; value?: string; onChange?: (value: string) => void; optional?: boolean }) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue ?? (optional ? "none" : ""));
  const selectedValue = value ?? internalValue;
  const selectedLabel = selectedValue === "none" ? "Não se aplica" : options.find((item) => item.id === selectedValue)?.name;
  const choose = (next: string) => {
    if (value === undefined) setInternalValue(next);
    onChange?.(next);
    setOpen(false);
  };

  return <div className="space-y-2">
    <Label>{label}</Label>
    <input type="hidden" name={name} value={selectedValue} />
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between !bg-myio-green/10 font-normal hover:!bg-myio-green/15">
          <span className={selectedLabel ? "truncate" : "truncate text-muted-foreground"}>{selectedLabel ?? "Digite ou selecione"}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder={`Buscar ${label.toLocaleLowerCase("pt-BR")}...`} />
          <CommandList>
            <CommandEmpty>Nenhuma opção encontrada.</CommandEmpty>
            <CommandGroup>
              {optional ? <CommandItem value="Não se aplica" onSelect={() => choose("none")}><Check className={selectedValue === "none" ? "opacity-100" : "opacity-0"} />Não se aplica</CommandItem> : null}
              {options.map((item) => <CommandItem key={item.id} value={item.name} onSelect={() => choose(item.id)}><Check className={selectedValue === item.id ? "opacity-100" : "opacity-0"} />{item.name}</CommandItem>)}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  </div>;
}
function LabeledInput({ name, label, type = "text", defaultValue, placeholder, required, min, step }: { name: string; label: string; type?: string; defaultValue?: string; placeholder?: string; required?: boolean; min?: string; step?: string }) { return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} required={required} min={min} step={step} /></div>; }
function formatMobilePhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.length > 11 && digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
function PhoneInput({ name, label, defaultValue = "" }: { name: string; label: string; defaultValue?: string }) {
  const [value, setValue] = useState(() => formatMobilePhone(defaultValue));
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type="tel" inputMode="numeric" autoComplete="tel-national" value={value} onChange={(event) => setValue(formatMobilePhone(event.target.value))} placeholder="(DDD) 9XXXX-XXXX" pattern="\([0-9]{2}\) 9[0-9]{4}-[0-9]{4}" maxLength={15} title="Informe um celular no formato (DDD) 9XXXX-XXXX" /></div>;
}
function formatTime(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  const validDigits = digits.split("").reduce((result, digit, index) => {
    if (index === 0 && Number(digit) > 2) return result;
    if (index === 1 && result[0] === "2" && Number(digit) > 3) return result;
    if (index === 2 && Number(digit) > 5) return result;
    return result + digit;
  }, "");
  return validDigits.length > 2 ? `${validDigits.slice(0, 2)}:${validDigits.slice(2)}` : validDigits;
}
function DateTimeInput({ name, label, defaultValue = "", required = false }: { name: string; label: string; defaultValue?: string; required?: boolean }) {
  const [date, setDate] = useState(defaultValue.slice(0, 10));
  const [time, setTime] = useState(() => formatTime(defaultValue.slice(11, 16)));
  const dateInputRef = useRef<HTMLInputElement>(null);
  const normalizedTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : "";
  const openCalendar = () => {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") input.showPicker();
    else input.focus();
  };
  return <div className="min-w-0 space-y-2">
    <Label htmlFor={`${name}-date`}>{label}</Label>
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_7rem] gap-2 overflow-hidden">
      <div className="relative min-w-0 overflow-hidden rounded-md border border-input bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring">
        <Input ref={dateInputRef} id={`${name}-date`} className="w-full min-w-0 appearance-none border-0 bg-transparent pr-10 shadow-none focus-visible:ring-0 [&::-webkit-calendar-picker-indicator]:opacity-0" type="date" value={date} onChange={(event) => setDate(event.target.value)} required={required} aria-label={`${label}: data`} />
        <Button type="button" variant="ghost" size="compactIcon" className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={openCalendar} aria-label={`Abrir calendário de ${label.toLocaleLowerCase("pt-BR")}`} title="Abrir calendário">
          <CalendarDays className="h-4 w-4" />
        </Button>
      </div>
      <Input className="min-w-0 max-w-full" type="text" inputMode="numeric" placeholder="hh:mm" value={time} onChange={(event) => setTime(formatTime(event.target.value))} pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]" maxLength={5} required={required} title="Informe o horário no formato hh:mm" aria-label={`${label}: hora e minutos`} />
    </div>
    <input type="hidden" name={name} value={date && normalizedTime ? `${date}T${normalizedTime}` : ""} />
  </div>;
}
function LabeledControlled({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <div className="space-y-2"><Label>{label}</Label><Input type={type} min={type === "number" ? "0.01" : undefined} step={type === "number" ? "0.01" : undefined} value={value} onChange={(event) => onChange(event.target.value)} /></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="border-l-2 border-primary pl-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value}</p></div>; }
function useSurveyDataShape() { return undefined as unknown as { userId: string; visits: Visit[]; clients: ClientOption[]; clientCategories: ClientCategory[]; projects: ProjectOption[]; units: Array<Named & { client_id: string }>; technicians: Profile[]; templates: Template[]; sections: Section[]; questions: Question[]; catalog: CatalogItem[]; screwdriverTypes: Named[]; wrenchSizes: Named[]; actionCatalog: SurveyAction[]; questionActions: QuestionAction[]; customCatalogs: CustomCatalog[]; cancellationReasons: CancellationReason[]; permissions: Set<string>; profileName: string; isErpAdmin: boolean } | undefined; }