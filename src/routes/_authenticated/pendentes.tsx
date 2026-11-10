import { CriticalGroup } from "@/components/central/critical-group";
import { Suspense } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { CentralDashboard } from "@/components/central/dashboard";
import { legalPendingLabel } from "@/lib/legal-pending";
import { PendingGroups } from "@/components/pending-groups";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PendingForMe } from "@/components/approval-workflow";
import { MyioLogo } from "@/components/myio-logo";
import { Bell, CheckCircle2, CodeXml, Phone, ShieldCheck, ShoppingCart, MessageCircleQuestion, FileSignature } from "lucide-react";
import { usePendingActions } from "@/hooks/use-pending-actions";
import { AppHeader } from "@/components/app-header";
import { TodoSection } from "@/components/personal-todos/todo-section";

export const Route = createFileRoute("/_authenticated/pendentes")({
  validateSearch: (s: Record<string, unknown>): { central?: string; user?: string; app?: string; sort?: string; view?: string; todo?: string } => ({ todo: typeof s.todo === "string" ? s.todo : undefined, central: s.central === "all" ? "all" : "mine", user: typeof s.user === "string" ? s.user : "", app: typeof s.app === "string" ? s.app : "", sort: ["due", "app"].includes(String(s.sort)) ? String(s.sort) : "critical", view: ["flow", "timeline"].includes(String(s.view)) ? String(s.view) : "users" }),
  component: PendentesPage,
  head: () => ({
    meta: [
      { title: "Central de Pendências | myio ERP" },
      { name: "description", content: "Tarefas pessoais compartilhadas, conversas e ações aguardando sua decisão na Central de Pendências myio ERP." },
      { property: "og:title", content: "Central de Pendências | myio ERP" },
      { property: "og:description", content: "Tarefas pessoais compartilhadas, conversas e ações aguardando sua decisão na Central de Pendências myio ERP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PendentesPage() {
  const { data, isLoading } = usePendingActions();
  const { data: me } = useCurrentUser();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const adminView = me?.isAdmin && search.central === "all";
  const change = (patch: Record<string,string>) => { void navigate({ search: prev => ({ ...prev, ...patch }) }); };
  return (
    <div className="min-h-screen bg-background">
      <AppHeader logo={<MyioLogo className="text-xl sm:text-2xl" />} />
      <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Bell className="h-6 w-6" />Central de Pendências</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ações que dependem de você...</p>
        </div>
        {me?.isAdmin && <div className="mb-6 flex gap-2"><Button variant="ghost" aria-pressed={!adminView} onClick={() => change({central:"mine"})}>Minhas Pendências</Button><Button variant="ghost" aria-pressed={!!adminView} onClick={() => change({central:"all"})}>Todas as Pendências</Button></div>}
        {adminView ? <Suspense fallback={<p>Carregando Dashboard...</p>}><CentralDashboard user={search.user ?? ""} app={search.app ?? ""} sort={search.sort ?? "critical"} view={search.view ?? "users"} onChange={change} /></Suspense> : <><div className="mb-6"><TodoSection key={search.todo ?? "list"} initialTask={search.todo} /></div>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando pendências...</p> : (
          <div className="space-y-6">
            {(
              <PendingGroups leading={<CriticalGroup />} items={[
      ...((data?.approvals ?? 0) > 0 ? [{ key: "approvals", app: "Supply", requester: "Você", count: data?.approvals ?? 0, row: <PendingLink icon={CheckCircle2} label="Aguardando minha aprovação" count={data?.approvals ?? 0} to="/pendentes" /> }] : []),
      ...((data?.supplyQueue ?? 0) > 0 ? [{ key: "queue", app: "Supply", requester: "Você", count: data?.supplyQueue ?? 0, row: <PendingLink icon={ShoppingCart} label="Compras e serviços a executar · Fila do Supply" count={data?.supplyQueue ?? 0} to="/dashboard" search={{ section: "queue", subsection: "supply" }} /> }] : []),
      ...((data?.userDeletions ?? 0) > 0 ? [{ key: "deletions", app: "Admin", requester: "Você", count: data?.userDeletions ?? 0, row: <PendingLink icon={ShieldCheck} label="Exclusões de usuários aguardando decisão" count={data?.userDeletions ?? 0} to="/dashboard" search={{ section: "admin", subsection: "usuarios" }} /> }] : []),
      ...(data?.legalItems ?? []).map(item => ({ key: `legal-${item.recordId}`, app: "Legal", requester: "Você", count: item.count, row: <PendingLink icon={FileSignature} label={legalPendingLabel(item)} count={item.count} to="/legal" search={{ record: item.recordId }} /> })),
      ...(data?.supplyQuestions ?? []).map(q => ({ key: `sq-${q.orderId}`, app: "Supply", requester: "Solicitante", count: q.count, row: <PendingLink icon={MessageCircleQuestion} label={`${q.approvalNumber ?? "—"} · Pergunta aguardando sua resposta · ${q.title}`} count={q.count} to="/dashboard" search={{ order: q.orderId }} /> })),
      ...(data?.codeItems ?? []).map((ticket) => ({ key: `c-${ticket.ticketId}`, app: "Code", requester: ticket.reporterName ?? "Solicitante", count: 1, row: <PendingLink icon={ticket.reason === "responder" ? MessageCircleQuestion : ticket.reason === "notificado" ? Bell : CodeXml} label={`${ticket.ticketNumber} · ${ticket.reason === "responder" ? "Pergunta aguardando sua resposta" : ticket.reason === "notificado" ? "Nova pergunta direcionada a outro usuário" : ticket.reason === "aceitar" ? "Confirmar atendimento" : "Ticket aguardando atendimento"} · ${new Date(ticket.createdAt).toLocaleDateString("pt-BR")} · ${ticket.title.length > 60 ? `${ticket.title.slice(0, 60)}…` : ticket.title}`} count={1} to="/development" search={{ ticket: ticket.ticketId }} /> })),
      ...(data?.mytosisItems ?? []).map((q) => ({ key: `m-${q.message_id}`, app: "Mytosis", requester: q.author_name ?? "Solicitante", count: 1, row: <Link to="/mytosis" search={{ node: q.node_id, task: q.task_id ?? undefined }} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/10"><MessageCircleQuestion className="h-5 w-5 shrink-0" /><span className="min-w-0 flex-1 text-sm font-medium">Mytosis · {q.node_title}{q.task_title ? ` · ${q.task_title}` : ""} · {q.question_text}</span></Link> })),
      ...(data?.supportCallItems ?? []).map((call) => ({ key: `s-${call.callId}`, app: "Chamados", requester: call.reason === "confirmar" ? "Você" : "Clientes", count: 1, row: <PendingLink icon={Phone} label={`#${call.callNumber} · ${call.reason === "confirmar" ? "Confirmar conclusão" : call.title}`} count={1} to="/chamados" search={{ chamado: call.callId }} /> })),
    ]} />
            )}
            {(data?.approvals ?? 0) > 0 ? <section id="approvals"><PendingForMe /></section> : null}
            {(data?.total ?? 0) === 0 ? <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhuma pendência no momento.</p> : null}
          </div>
        )}
        </>}
      </main>
    </div>
  );
}

function PendingLink({ icon: Icon, label, count, to, search }: { icon: typeof Bell; label: string; count: number; to: "/legal" | "/pendentes" | "/dashboard" | "/development" | "/chamados"; search?: { record: string } | { section: "admin"; subsection: "usuarios" } | { section: "queue"; subsection?: "supply" } | { ticket: string } | { chamado: string } | { order: string } }) {
  const content = <><Icon className={`h-5 w-5 shrink-0${(Icon === MessageCircleQuestion || Icon === FileSignature) ? " text-destructive" : ""}`} /><span className="min-w-0 flex-1 text-sm font-medium">{label}</span></>;
  if (to === "/pendentes") return <a href="#approvals" className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/10">{content}</a>;
  if (to === "/legal") return <Link to="/legal" search={search && "record" in search ? search : {}} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/10">{content}</Link>;
  if (to === "/development") return <Link to="/development" search={(search && "ticket" in search) ? search : { ticket: undefined }} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/10">{content}</Link>;
  if (to === "/chamados") return <Link to="/chamados" search={(search && "chamado" in search) ? search : { chamado: undefined }} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/10">{content}</Link>;
  if (to === "/dashboard" && search && "order" in search) return <Link to="/dashboard" search={{ order: search.order, section: undefined, subsection: undefined }} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/10">{content}</Link>;
  return <Link to="/dashboard" search={search && "section" in search ? { section: search.section, subsection: "subsection" in search ? search.subsection : undefined } : { section: "queue", subsection: undefined }} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/10">{content}</Link>;
}
