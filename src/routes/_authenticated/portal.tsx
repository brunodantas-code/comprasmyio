import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AtSign, Boxes, CircleDollarSign, Cog, FileSignature, Mail, Phone, Settings2, UserRound, UsersRound, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyioPlatformLogo } from "@/components/myio-platform-logo";
import { ErpAppAccessAdmin } from "@/components/erp-app-access-admin";

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
    { key: "supply", name: "myio supply", description: ["Compras, solicitações diversas", "aprovações e estoque"], to: "/dashboard" as const },
    { key: "cash_flow", name: "myio cash flow", description: ["Gestão financeira", "e fluxo de caixa"], to: "/cash-flow" as const },
    { key: "crm", name: "myio CRM", description: ["Relacionamento", "com clientes"], to: "/crm" as const },
    { key: "legal", name: "myio Legal", description: ["Jurídico e Contratos"], to: "/legal" as const },
    { key: "rh", name: "myio RH", description: ["Gestão de Pessoas"], to: "/rh" as const },
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
              <TabsList>
                <TabsTrigger value="apps"><Boxes className="mr-2 h-4 w-4" />Aplicativos</TabsTrigger>
                <TabsTrigger value="users"><Settings2 className="mr-2 h-4 w-4" />Usuários e aplicativos</TabsTrigger>
              </TabsList>
            ) : null}
          </div>

          <TabsContent value="apps">
            {apps.length ? (
               <div className="grid grid-cols-2 gap-x-5 gap-y-12 sm:gap-x-8 lg:grid-cols-4">
                 {apps.map(({ key, name, description, to }) => (
                    <div key={key} className="flex min-w-0 flex-col items-center text-center">
                      <Link
                        to={to}
                        aria-label={`Acessar ${name}`}
                        title={`Acessar ${name}`}
                        className="group relative flex h-32 w-32 flex-col items-center justify-between rounded-[1.75rem] border-2 border-primary bg-primary px-3 pb-3 pt-2 text-primary-foreground outline-none transition-transform hover:scale-105 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
                      >
                        {key === "supply" ? (
                          <>
                            <span className="relative block h-20 w-full" aria-hidden="true">
                              <Cog className="absolute bottom-0 left-2 h-14 w-14 stroke-[1.7]" />
                              <Cog className="absolute right-2 top-0 h-12 w-12 stroke-[1.7]" />
                            </span>
                            <span className="text-sm font-normal leading-none">{name}</span>
                          </>
                        ) : key === "cash_flow" ? (
                          <>
                            <span className="flex h-20 w-full items-center justify-center" aria-hidden="true">
                              <CircleDollarSign className="h-16 w-16 stroke-[1.5]" />
                            </span>
                            <span className="text-sm font-normal leading-none">{name}</span>
                          </>
                        ) : key === "crm" ? (
                          <>
                            <span className="relative block h-20 w-full" aria-hidden="true">
                              <AtSign className="absolute left-1 top-2 h-9 w-9 stroke-[1.6]" />
                              <Phone className="absolute right-1 top-1 h-8 w-8 stroke-[1.6]" />
                              <Mail className="absolute bottom-0 left-1/2 h-9 w-9 -translate-x-1/2 stroke-[1.6]" />
                              <UserRound className="absolute bottom-1 right-0 h-7 w-7 stroke-[1.6]" />
                            </span>
                            <span className="text-sm font-normal leading-none">{name}</span>
                          </>
                        ) : key === "legal" ? (
                          <>
                            <span className="flex h-20 w-full items-center justify-center" aria-hidden="true">
                              <FileSignature className="h-16 w-16 stroke-[1.5]" />
                            </span>
                            <span className="text-sm font-normal leading-none">{name}</span>
                          </>
                        ) : (
                          <>
                            <span className="flex h-20 w-full items-center justify-center" aria-hidden="true">
                              <UsersRound className="h-16 w-16 stroke-[1.6]" />
                            </span>
                            <span className="text-sm font-normal leading-none">{name}</span>
                          </>
                       )}
                     </Link>
                      <p className="mt-5 w-32 max-w-full break-words text-center text-sm leading-5 text-muted-foreground">
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
          </TabsContent>
          {data.isErpAdmin ? <TabsContent value="users"><ErpAppAccessAdmin /></TabsContent> : null}
        </Tabs>
      </main>
    </div>
  );
}