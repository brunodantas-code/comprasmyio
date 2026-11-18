import { NumericMarker, AlertMarker } from "@/components/cde/numeric-markers";
import { legalPendingLabel } from "@/lib/legal-pending";
import { ListItemStyleVars } from "@/components/cde/list-item-style";
import { TopIconStyleVars } from "@/components/cde/top-icon-style";
import {projectPendingItems} from "@/components/projects/pending-items";
import { PendingGroups } from "@/components/pending-groups";
import { useState } from "react";
import type React from "react";
import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircleQuestion, Bell, CheckCircle2, CodeXml, FileSignature, LayoutGrid, Phone, ShieldCheck, ShoppingCart, PackageCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { MyioPlatformLogo } from "@/components/myio-platform-logo";
import { useAppOrder, useAppTile, APP_TILE_DEFAULT, appTileColorVars, homeHeaderVars, homeHeaderLogoTone, mobileTileVars } from "@/components/cde/app-order-config";
import { AppTileFace } from "@/components/cde/app-tile";
import { CorporateBanner } from "@/components/corporate/corporate-banner";
import { DEFAULT_PORTAL_SECTIONS, usePortalSections } from "@/components/corporate/portal-sections";
import { AppAccessLink } from "@/components/app-access-link";
import { HeaderMenu, UserNameBlock, UserGreetingInfo } from "@/components/app-header";
import { usePendingActions } from "@/hooks/use-pending-actions";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { PersonalSignature } from "@/components/personal-signature";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TodoSection } from "@/components/personal-todos/todo-section";
import { CriticalGroup, useCriticalPending } from "@/components/central/critical-group";

export const Route = createFileRoute("/_authenticated/portal")({
  validateSearch: (search: Record<string, unknown>): { view?: "users" } => (search.view === "users" ? { view: "users" } : {}),
  beforeLoad: ({ search }) => { if (search.view === "users") throw redirect({ to: "/acessos", search: { section: "usuarios" } }); },
  component: PortalPage,
  head: () => ({
    meta: [
      { title: "Aplicativos | myio ERP" },
      { name: "description", content: "Acesse os aplicativos liberados para sua conta na plataforma myio ERP." },
      { property: "og:title", content: "Aplicativos | myio ERP" },
      { property: "og:description", content: "Portal de aplicativos da plataforma myio ERP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PortalPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const navigateView = useNavigate();
  const activeView: "apps" | "users" = search.view === "users" ? "users" : "apps";
  const setActiveView = (view: "apps" | "users") => navigateView({ to: "/portal", search: view === "users" ? { view: "users" } : {} });
  const { data: pendingActions } = usePendingActions();
  const { data: criticalPending } = useCriticalPending();
  const { data: appOrder } = useAppOrder();
  const tile = useAppTile().data ?? APP_TILE_DEFAULT;
  const portalSections = usePortalSections().data ?? DEFAULT_PORTAL_SECTIONS;
  const { data, isLoading } = useQuery({
    queryKey: ["my-erp-access"],
    queryFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw authError ?? new Error("Sessão não encontrada");
      const userId = authData.user.id;
      const [{ data: profile }, { data: accesses, error: accessError }, { data: erpAdmin }, { data: mytosisRole }] = await Promise.all([
        supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle(),
        supabase.from("user_app_access").select("app_key").eq("user_id", userId),
        supabase.from("erp_admins").select("user_id").eq("user_id", userId).maybeSingle(),
        supabase.rpc("mytosis_role", { _user_id: userId }),
      ]);
      if (accessError) throw accessError;
      return {
        userId,
        name: profile?.full_name || profile?.email || authData.user.email || "Usuário",
        appKeys: new Set([...(accesses ?? []).map((access) => access.app_key), ...(mytosisRole ? ["mytosis"] : [])]),
        isErpAdmin: Boolean(erpAdmin),
      };
    },
  });

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading || !data) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;

  const firstName = data.name.trim().split(/\s+/)[0] || "Usuário";

  const apps = [
    { key: "supply", name: "Supply", description: ["Solicitações", "e Estoque"], to: "/dashboard" as const },
    { key: "cash_flow", name: "Cash Flow", description: ["Gestão financeira"], to: "/cash-flow" as const },
    { key: "crm", name: "CRM", description: ["Vendas e", "Relacionamento"], to: "/crm" as const },
    { key: "legal", name: "Legal", description: ["Contratos", "Atas de Reunião", "Jurídico"], to: "/legal" as const },
    { key: "rh", name: "RH", description: ["Gestão de Pessoas"], to: "/rh" as const },
    { key: "site_survey", name: "Site Survey", description: ["Visitas técnicas"], to: "/site-survey" as const },
    { key: "chamados", name: "OpDesk", description: ["Suporte ao cliente", "e operação"], to: "/chamados" as const },
    { key: "development", name: "Code", description: ["Melhorias e Bugs"], to: "/development" as const },
    { key: "mytosis", name: "Mytosis", description: ["Fluxogramas", "e processos"], to: "/mytosis" as const },
    { key: "wishlist", name: "Wishlist", description: ["Desejos e", "inovação"], to: "/wishlist" as const },
    { key: "projects", name: "Projects", description: ["Planejamento e", "controle de projetos"], to: "/projects" as const },
    { key: "cde", name: "CDE", description: ["Padrões de", "interface"], to: "/cde" as const },
  ].filter((app) => (app.key === "cde" ? (data.isErpAdmin || data.appKeys.has("cde")) : data.appKeys.has(app.key)) || (app.key === "chamados" && pendingActions?.isCustomerSupportAnalyst))
    .sort((a, b) => (appOrder ? appOrder.indexOf(a.key) - appOrder.indexOf(b.key) : 0));

  const renderApp = ({ key, name, description, to }: (typeof apps)[number]) => (
    <div key={key} className="flex min-w-0 flex-col items-center text-center">
      <AppAccessLink
        appKey={key}
        to={to}
        aria-label={`Acessar ${name}`}
        title={`Acessar ${name}`}
        className="mobile-app-tile group relative flex flex-col items-center justify-between rounded-2xl border-2 border-[color:var(--tile-border,var(--primary))] bg-[var(--tile-fill,var(--primary))] px-1 pb-2 pt-1 text-primary-foreground outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
      >
        {key === "supply" && (pendingActions?.supply ?? 0) > 0 ? <PendingBadge count={pendingActions?.supply ?? 0} label="pendências no Supply" /> : null}
        {key === "development" && (pendingActions?.codeTickets ?? 0) > 0 ? <PendingBadge count={pendingActions?.codeTickets ?? 0} label="tickets pendentes no Code" /> : null}
        {key === "chamados" && (pendingActions?.supportCalls ?? 0) > 0 ? <PendingBadge count={pendingActions?.supportCalls ?? 0} label="chamados pendentes no OpDesk" /> : null}
        {key === "legal" && (pendingActions?.legalSignatures ?? 0) > 0 ? <PendingBadge count={pendingActions?.legalSignatures ?? 0} label="pendências no Legal" /> : null}
        <AppTileFace appKey={key} name={name} tile={tile} mobile />
      </AppAccessLink>
      <p className="mt-2 w-full break-words text-center text-[0.68rem] leading-4 text-[color:var(--tile-below,var(--muted-foreground))]">{description.map((line) => <span key={line} className="block">{line}</span>)}</p>
    </div>
  );

  return (
    <div style={activeView === "apps" ? appTileColorVars(tile) as React.CSSProperties : undefined} className="flex h-dvh flex-col overflow-hidden bg-[var(--portal-bg,var(--background))] sm:block sm:h-auto sm:min-h-screen sm:overflow-visible">
      <header style={homeHeaderVars(tile) as React.CSSProperties} className="home-page-header sticky top-0 z-40 shrink-0 sm:border-b sm:border-border">
      <TopIconStyleVars /><ListItemStyleVars />
        <div className="app-header-workspace mx-auto max-w-7xl px-4 pb-9 pt-5 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:block">
            <div className="min-w-0"><MyioPlatformLogo tone={homeHeaderLogoTone(tile, true)} className="h-10 sm:hidden" />
            <MyioPlatformLogo tone={homeHeaderLogoTone(tile)} className="hidden h-10 sm:inline-flex" /></div>
            <div className="shrink-0 sm:hidden">
              <HeaderMenu homePage={activeView === "apps"} userName={data.name} onSignOut={handleSignOut} onChangePassword={() => setPasswordOpen(true)} onOpenSignature={() => setSignatureOpen(true)} buttonClass="top-icon !bg-transparent !text-foreground shadow-none hover:!bg-transparent hover:!text-foreground" />
            </div>
          </div>
          <div className="mt-8 sm:hidden">
            <p className="text-xl font-bold">Olá, {firstName}</p>
            <UserGreetingInfo />
          </div>
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <UserNameBlock userName={data.name} />
            {activeView === "users" ? (
              <Button variant="ghost" size="icon" className="top-icon !bg-transparent !text-foreground shadow-none hover:!bg-transparent hover:!text-foreground" onClick={() => setActiveView("apps")} title="Início" aria-label="Voltar aos aplicativos">
                <LayoutGrid className="h-4 w-4" />
              </Button>
            ) : null}
            <HeaderMenu homePage={activeView === "apps"} userName={data.name} onSignOut={handleSignOut} onChangePassword={() => setPasswordOpen(true)} onOpenSignature={() => setSignatureOpen(true)} buttonClass="top-icon !bg-transparent !text-foreground shadow-none hover:!bg-transparent hover:!text-foreground" />
          </div>
        </div>
      </header>

      <main className="no-scrollbar relative z-10 -mt-3 min-h-0 flex-1 overflow-y-auto rounded-t-xl bg-[var(--portal-bg,var(--background))] px-3 py-10 sm:mx-auto sm:mt-0 sm:min-h-0 sm:max-w-7xl sm:overflow-visible sm:rounded-none sm:px-6 sm:py-14">
        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as "apps" | "users")}>
          <TabsContent value="apps">
            {portalSections.map((section) => {
              const block = section === "messages" ? <CorporateBanner />
                : section === "apps" ? (<>{apps.length ? (
               <>
                  <div aria-label="Aplicativos disponíveis no mobile" style={mobileTileVars(tile) as React.CSSProperties} className="mobile-app-grid grid pb-2 sm:hidden">
                    {apps.map(renderApp)}
                 </div>
                 <div aria-label="Aplicativos disponíveis" style={{ columnGap: tile.gapX, rowGap: tile.gapY }} className="hidden flex-wrap sm:flex">
                  {apps.map(({ key, name, description, to }) => (
                     <div key={key} className="relative min-w-0 snap-start justify-self-center sm:justify-self-start">
                         {key === "supply" && (pendingActions?.supply ?? 0) > 0 ? <PendingBadge count={pendingActions?.supply ?? 0} label="pendências no Supply" /> : null}
                          {key === "development" && (pendingActions?.codeTickets ?? 0) > 0 ? <PendingBadge count={pendingActions?.codeTickets ?? 0} label="tickets pendentes no Code" /> : null}
                           {key === "chamados" && (pendingActions?.supportCalls ?? 0) > 0 ? <PendingBadge count={pendingActions?.supportCalls ?? 0} label="chamados pendentes no OpDesk" /> : null}
                        {key === "legal" && (pendingActions?.legalSignatures ?? 0) > 0 ? <PendingBadge count={pendingActions?.legalSignatures ?? 0} label="pendências no Legal" /> : null}
                     <div style={{ zoom: tile.tilePct / 100 }} className="flex w-24 min-w-0 flex-col items-center text-center sm:w-28">
                      <AppAccessLink
                        appKey={key}
                        to={to}
                        aria-label={`Acessar ${name}`}
                        title={`Acessar ${name}`}
                        className="group relative flex h-24 w-24 flex-col items-center justify-between rounded-3xl border-2 border-[color:var(--tile-border,var(--primary))] bg-[var(--tile-fill,var(--primary))] px-2 pb-2 pt-1.5 text-primary-foreground outline-none transition-transform hover:scale-105 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 sm:h-28 sm:w-28"
                      >
        <AppTileFace appKey={key} name={name} tile={tile} />
                     </AppAccessLink>
                      <p className="mt-3 w-24 max-w-full break-words text-center text-xs leading-4 text-[color:var(--tile-below,var(--muted-foreground))] sm:w-28 sm:text-sm sm:leading-5">
                        {description.map((line) => <span key={line} className="block sm:whitespace-nowrap">{line}</span>)}
                      </p>
                     </div>
                     </div>
                   ))}
                 </div>
               </>
            ) : (
              <div className="rounded-md border border-dashed border-border bg-card p-8 text-center">
                <h2 className="text-xl font-bold">Nenhum aplicativo liberado</h2>
                <p className="mt-2 text-sm text-muted-foreground">Solicite ao Admin do ERP a liberação dos aplicativos necessários.</p>
              </div>
            )}</>)
                : section === "todos" ? <TodoSection />
                : (<>{(pendingActions?.total ?? 0) > (pendingActions?.todoCount ?? 0) || (criticalPending?.length ?? 0) > 0 ? (
              <section aria-labelledby="pending-title">
                <PendingGroups leading={<CriticalGroup />} items={[
      ...projectPendingItems(pendingActions?.projectsItems??[]),
      ...((pendingActions?.approvals ?? 0) > 0 ? [{ key: "approvals", app: "Supply", requester: "Você", count: pendingActions?.approvals ?? 0, row: <PendingRow icon={CheckCircle2} label="Aguardando minha aprovação" count={pendingActions?.approvals ?? 0} to="/pendentes" /> }] : []),
      ...((pendingActions?.supplyQueue ?? 0) > 0 ? [{ key: "queue", app: "Supply", requester: "Você", count: pendingActions?.supplyQueue ?? 0, row: <PendingRow icon={ShoppingCart} label="Compras e serviços a executar · Fila do Supply" count={pendingActions?.supplyQueue ?? 0} to="/dashboard" search={{ section: "queue", subsection: "supply" }} /> }] : []),
      ...((pendingActions?.userDeletions ?? 0) > 0 ? [{ key: "deletions", app: "Admin", requester: "Você", count: pendingActions?.userDeletions ?? 0, row: <PendingRow icon={ShieldCheck} label="Exclusões de usuários aguardando decisão" count={pendingActions?.userDeletions ?? 0} to="/dashboard" search={{ section: "admin", subsection: "usuarios" }} /> }] : []),
      ...(pendingActions?.legalItems ?? []).map(item => ({ key: `legal-${item.recordId}`, app: "Legal", requester: "Você", count: item.count, row: <PendingRow icon={FileSignature} label={legalPendingLabel(item)} count={item.count} to="/legal" search={{ record: item.recordId }} /> })),
      ...(pendingActions?.supplyQuestions ?? []).map(q => ({ key: `sq-${q.orderId}`, app: "Supply", requester: "Solicitante", count: q.count, row: <PendingRow icon={MessageCircleQuestion} label={`${q.approvalNumber ?? "—"} · Pergunta aguardando sua resposta · ${q.title}`} count={q.count} to="/dashboard" search={{ order: q.orderId }} /> })),
      ...(pendingActions?.supplyReceipts ?? []).map(order => ({ key: `receipt-${order.id}`, app: "Supply", requester: "Você", count: 1, row: <PendingRow icon={PackageCheck} label={`${order.approval_number ?? "—"} · Conferir recebimento · ${order.item_name}`} count={1} to="/dashboard" search={{ order: order.id }} /> })),
      ...(pendingActions?.codeItems ?? []).map((ticket) => ({ key: `c-${ticket.ticketId}`, app: "Code", requester: ticket.reporterName ?? "Solicitante", count: 1, row: <PendingRow icon={ticket.reason === "responder" ? MessageCircleQuestion : ticket.reason === "notificado" ? Bell : CodeXml} number={ticket.ticketNumber} label={`${ticket.reason === "responder" ? "Pergunta aguardando sua resposta" : ticket.reason === "notificado" ? "Nova pergunta direcionada a outro usuário" : ticket.reason === "aceitar" ? "Confirmar atendimento" : "Ticket aguardando atendimento"} · ${new Date(ticket.createdAt).toLocaleDateString("pt-BR")} · ${ticket.title.length > 60 ? `${ticket.title.slice(0, 60)}…` : ticket.title}`} count={1} to="/development" search={{ ticket: ticket.ticketId }} /> })),
      ...(pendingActions?.supportCallItems ?? []).map((call) => ({ key: `s-${call.callId}`, app: "Chamados", requester: call.reason === "confirmar" ? "Você" : "Clientes", count: 1, row: <PendingRow icon={Phone} number={call.callNumber} label={`${call.reason === "confirmar" ? "Confirmar conclusão" : call.title}`} count={1} to="/chamados" search={{ chamado: call.callId }} /> })),
    ]} />
              </section>
            ) : null}</>);
              return <div key={section} data-portal-section={section} className="mb-10 empty:hidden">{block}</div>;
            })}
          </TabsContent>
        </Tabs>
      </main>
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
      <Dialog open={signatureOpen} onOpenChange={setSignatureOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Minha assinatura</DialogTitle></DialogHeader>
          <PersonalSignature userId={data.userId} initiallyOpen />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PendingBadge({ count, label }: { count: number; label: string }) {
  return <AlertMarker count={count} className="pointer-events-none absolute -right-2 -top-2 z-10" aria-label={`${count} ${label}`} />;
}

function PendingRow({ icon: Icon, label, count, to, search, number }: { icon: typeof Bell; label: string; number?: string | number; count: number; to: "/legal" | "/pendentes" | "/dashboard" | "/development" | "/chamados"; search?: { record: string } | { section: "admin"; subsection: "usuarios" } | { section: "queue"; subsection?: "supply" } | { ticket: string } | { chamado: string } | { order: string } }) {
  const content = <><Icon className={`h-5 w-5 shrink-0${(Icon === MessageCircleQuestion || Icon === FileSignature) ? " text-destructive" : ""}`} /><span className="min-w-0 flex-1 text-sm font-medium">{number !== undefined ? <><NumericMarker>{number}</NumericMarker>{" · "}</> : null}{label}</span></>;
  if (to === "/pendentes") return <Link to="/pendentes" className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/10">{content}</Link>;
  if (to === "/legal") return <Link to="/legal" search={search && "record" in search ? search : {}} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/10">{content}</Link>;
  if (to === "/development") return <Link to="/development" search={(search && "ticket" in search) ? search : { ticket: undefined }} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/10">{content}</Link>;
  if (to === "/chamados") return <Link to="/chamados" search={(search && "chamado" in search) ? search : { chamado: undefined }} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/10">{content}</Link>;
  if (to === "/dashboard" && search && "order" in search) return <Link to="/dashboard" search={{ order: search.order, section: undefined, subsection: undefined }} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/10">{content}</Link>;
  return (
    <Link to="/dashboard" search={search && "section" in search ? { section: search.section, subsection: "subsection" in search ? search.subsection : undefined } : { section: "queue", subsection: undefined }} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/10">{content}</Link>
  );
}