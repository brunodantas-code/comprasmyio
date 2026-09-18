import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Boxes, CheckCircle2, CodeXml, DollarSign, FileSignature, Settings, Settings2, ShieldCheck, ShoppingCart, UsersRound, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyioPlatformLogo } from "@/components/myio-platform-logo";
import { ErpAppAccessAdmin } from "@/components/erp-app-access-admin";
import { CrmFunnelIcon } from "@/components/crm-funnel-icon";
import { usePendingActions } from "@/hooks/use-pending-actions";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/_authenticated/portal")({
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
  const { data: pendingActions } = usePendingActions();
  const { data, isLoading } = useQuery({
    queryKey: ["my-erp-access"],
    queryFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw authError ?? new Error("Sessão não encontrada");
      const userId = authData.user.id;
      const [{ data: profile }, { data: accesses, error: accessError }, { data: erpAdmin }] = await Promise.all([
        supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle(),
        supabase.from("user_app_access").select("app_key").eq("user_id", userId),
        supabase.from("erp_admins").select("user_id").eq("user_id", userId).maybeSingle(),
      ]);
      if (accessError) throw accessError;
      return {
        name: profile?.full_name || profile?.email || authData.user.email || "Usuário",
        appKeys: new Set((accesses ?? []).map((access) => access.app_key)),
        isErpAdmin: Boolean(erpAdmin),
      };
    },
  });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading || !data) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;

  const apps = [
    { key: "supply", name: "Supply", description: ["Solicitações", "e Estoque"], to: "/dashboard" as const },
    { key: "cash_flow", name: "Cash Flow", description: ["Gestão financeira"], to: "/cash-flow" as const },
    { key: "crm", name: "CRM", description: ["Vendas e", "Relacionamento"], to: "/crm" as const },
    { key: "legal", name: "Legal", description: ["Contratos e", "Jurídico"], to: "/legal" as const },
    { key: "rh", name: "RH", description: ["Gestão de Pessoas"], to: "/rh" as const },
    { key: "development", name: "Code", description: ["Melhorias e Bugs"], to: "/development" as const },
  ].filter((app) => data.appKeys.has(app.key));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <MyioPlatformLogo className="h-9 sm:h-10" />
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-semibold">{data.name}</p>
              <p className="text-xs text-muted-foreground">Plataforma ERP</p>
            </div>
            <Button asChild variant="ghost" size="icon" className="relative" title="Central de Pendências" aria-label={`Central de Pendências: ${pendingActions?.total ?? 0}`}>
              <Link to="/pendentes">
                <Bell className="h-5 w-5" />
                {(pendingActions?.total ?? 0) > 0 ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{(pendingActions?.total ?? 0) > 99 ? "99+" : pendingActions?.total}</span> : null}
              </Link>
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sair" aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <Tabs defaultValue="apps">
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold sm:text-4xl">Meus Aplicativos</h1>
              <p className="mt-2 text-muted-foreground">Escolha onde deseja trabalhar.</p>
            </div>
            {data.isErpAdmin ? (
              <TabsList className="!grid w-full grid-cols-2 sm:mb-8 lg:mr-[calc((100%-5rem)/6-7.25rem)] lg:w-56 lg:self-end">
                <TabsTrigger value="apps" className="w-full min-w-0 px-2"><Boxes className="mr-2 h-4 w-4 shrink-0" />Aplicativos</TabsTrigger>
                <TabsTrigger value="users" className="w-full min-w-0 px-2"><Settings2 className="mr-2 h-4 w-4 shrink-0" />Acessos</TabsTrigger>
              </TabsList>
            ) : null}
          </div>

          <TabsContent value="apps">
            {apps.length ? (
               <div className="grid grid-cols-3 gap-x-3 gap-y-8 lg:grid-cols-6 lg:gap-x-4">
                 {apps.map(({ key, name, description, to }) => (
                    <div key={key} className="flex w-24 min-w-0 justify-self-start flex-col items-center text-center sm:w-28">
                      <Link
                        to={to}
                        aria-label={`Acessar ${name}`}
                        title={`Acessar ${name}`}
                        className="group relative flex h-24 w-24 flex-col items-center justify-between rounded-3xl border-2 border-primary bg-primary px-2 pb-2 pt-1.5 text-primary-foreground outline-none transition-transform hover:scale-105 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 sm:h-28 sm:w-28"
                      >
                         {key === "supply" && (pendingActions?.supply ?? 0) > 0 ? <PendingBadge count={pendingActions?.supply ?? 0} label="pendências no Supply" /> : null}
                          {key === "development" && (pendingActions?.codeTickets ?? 0) > 0 ? <PendingBadge count={pendingActions?.codeTickets ?? 0} label="tickets pendentes no Code" /> : null}
                        {key === "supply" ? (
                          <>
                            <span className="flex h-14 w-full translate-y-1 items-center justify-center sm:h-16" aria-hidden="true">
                              <Settings className="h-14 w-14 stroke-[1.7] sm:h-16 sm:w-16" />
                            </span>
                            <span className="text-sm font-normal leading-none">{name}</span>
                          </>
                        ) : key === "cash_flow" ? (
                          <>
                            <span className="flex h-14 w-full translate-y-1 items-center justify-center sm:h-16" aria-hidden="true">
                              <DollarSign className="h-14 w-14 stroke-[3.5] sm:h-16 sm:w-16" />
                            </span>
                            <span className="text-sm font-normal leading-none">{name}</span>
                          </>
                        ) : key === "crm" ? (
                          <>
                            <span className="flex h-14 w-full translate-y-1 items-center justify-center sm:h-16" aria-hidden="true">
                              <CrmFunnelIcon className="h-14 w-14 stroke-[3] sm:h-16 sm:w-16" />
                            </span>
                            <span className="text-sm font-normal leading-none">{name}</span>
                          </>
                        ) : key === "legal" ? (
                          <>
                            <span className="flex h-14 w-full translate-y-1 items-center justify-center sm:h-16" aria-hidden="true">
                              <FileSignature className="h-14 w-14 stroke-[1.8] sm:h-16 sm:w-16" />
                            </span>
                            <span className="text-sm font-normal leading-none">{name}</span>
                          </>
                        ) : key === "rh" ? (
                          <>
                            <span className="flex h-14 w-full translate-y-1 items-center justify-center sm:h-16" aria-hidden="true">
                              <UsersRound className="h-14 w-14 stroke-[1.8] sm:h-16 sm:w-16" />
                            </span>
                            <span className="text-sm font-normal leading-none">{name}</span>
                          </>
                        ) : (
                          <>
                            <span className="flex h-14 w-full translate-y-1 items-center justify-center sm:h-16" aria-hidden="true">
                              <CodeXml className="h-14 w-14 stroke-[2.8] sm:h-16 sm:w-16" />
                            </span>
                            <span className="text-[0.7rem] font-normal leading-none sm:text-xs">{name}</span>
                          </>
                        )}
                     </Link>
                      <p className="mt-3 w-24 max-w-full break-words text-center text-xs leading-4 text-muted-foreground sm:w-28 sm:text-sm sm:leading-5">
                        {description.map((line) => <span key={line} className="block">{line}</span>)}
                      </p>
                   </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border bg-card p-8 text-center">
                <h2 className="text-xl font-bold">Nenhum aplicativo liberado</h2>
                <p className="mt-2 text-sm text-muted-foreground">Solicite ao Admin do ERP a liberação dos aplicativos necessários.</p>
              </div>
            )}

            {(pendingActions?.total ?? 0) > 0 ? (
              <section className="mt-12" aria-labelledby="pending-title">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 id="pending-title" className="flex items-center gap-2 text-xl font-bold"><Bell className="h-5 w-5" />Minhas pendências</h2>
                  <Button asChild variant="outline" size="sm"><Link to="/pendentes">Ver painel</Link></Button>
                </div>
                <div className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
                  {(pendingActions?.approvals ?? 0) > 0 ? <PendingRow icon={CheckCircle2} label="Aguardando minha aprovação" count={pendingActions?.approvals ?? 0} to="/pendentes" /> : null}
                  {(pendingActions?.supplyQueue ?? 0) > 0 ? <PendingRow icon={ShoppingCart} label="Fila do Supply" count={pendingActions?.supplyQueue ?? 0} to="/dashboard" search={{ section: "queue" }} /> : null}
                  {(pendingActions?.userDeletions ?? 0) > 0 ? <PendingRow icon={ShieldCheck} label="Exclusões de usuários aguardando decisão" count={pendingActions?.userDeletions ?? 0} to="/dashboard" search={{ section: "admin", subsection: "usuarios" }} /> : null}
                  {(pendingActions?.codeItems ?? []).map((ticket) => <PendingRow key={ticket.ticketId} icon={CodeXml} label={`#${ticket.ticketNumber} · ${ticket.reason === "responder" ? "Responder ao Admin" : ticket.reason === "aceitar" ? "Confirmar atendimento" : "Ticket aguardando atendimento"}`} count={1} to="/development" search={{ ticket: ticket.ticketId }} />)}
                </div>
              </section>
            ) : null}
          </TabsContent>
          {data.isErpAdmin ? <TabsContent value="users"><ErpAppAccessAdmin /></TabsContent> : null}
        </Tabs>
      </main>
    </div>
  );
}

function PendingBadge({ count, label }: { count: number; label: string }) {
  return <span className="absolute -right-2 -top-2 flex h-8 min-w-8 items-center justify-center rounded-full bg-destructive px-2 text-sm font-bold text-destructive-foreground shadow-md" aria-label={`${count} ${label}`}>{count > 99 ? "99+" : count}</span>;
}

function PendingRow({ icon: Icon, label, count, to, search }: { icon: typeof Bell; label: string; count: number; to: "/pendentes" | "/dashboard" | "/development"; search?: { section: "admin"; subsection: "usuarios" } | { section: "queue" } | { ticket: string } }) {
  return (
    <Link to={to} search={search} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/10">
      <Icon className="h-5 w-5 shrink-0" />
      <span className="min-w-0 flex-1 text-sm font-medium">{label}</span>
      <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-destructive px-2 text-xs font-bold text-destructive-foreground">{count > 99 ? "99+" : count}</span>
    </Link>
  );
}