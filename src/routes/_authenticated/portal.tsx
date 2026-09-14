import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Cog, ContactRound, Landmark, LogOut, Scale, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    { key: "supply", name: "myio supply", description: "Compras, solicitações, aprovações e estoque.", to: "/dashboard" as const },
    { key: "cash_flow", name: "myio cash flow", description: "Gestão financeira e fluxo de caixa.", to: "/cash-flow" as const },
    { key: "crm", name: "myio CRM", description: "Gestão de relacionamento com clientes.", to: "/crm" as const },
    { key: "legal", name: "myio Legal", description: "Gestão jurídica e acompanhamento de demandas.", to: "/legal" as const },
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
              <Badge variant="outline" className="mb-3">myio ERP</Badge>
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
               <div className="grid gap-x-14 gap-y-10 sm:grid-cols-2">
                 {apps.map(({ key, name, description, to }) => (
                   <div key={key} className="flex min-w-0 flex-col items-start">
                     <Link
                       to={to}
                       aria-label={`Acessar ${name}`}
                       title={`Acessar ${name}`}
                       className="group relative flex h-24 w-24 items-center justify-center rounded-md text-myio-purple outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
                     >
                       {key === "supply" ? (
                         <>
                            <Cog className="absolute bottom-3 left-3 h-14 w-14 stroke-[1.7]" />
                            <Cog className="absolute right-3 top-3 h-12 w-12 stroke-[1.7]" />
                         </>
                        ) : key === "cash_flow" ? (
                         <Landmark className="h-16 w-16 stroke-[1.5]" />
                        ) : key === "crm" ? (
                          <ContactRound className="h-16 w-16 stroke-[1.5]" />
                        ) : (
                          <Scale className="h-16 w-16 stroke-[1.5]" />
                       )}
                     </Link>
                     <h2 className="mt-4 text-2xl font-extrabold text-myio-purple">{name}</h2>
                     <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
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