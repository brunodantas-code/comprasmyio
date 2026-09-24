import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MyioAppLogo } from "@/components/myio-app-logo";
import { CrmFunnelIcon } from "@/components/crm-funnel-icon";
import { AppHeader } from "@/components/app-header";

export const Route = createFileRoute("/_authenticated/crm")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_app_access").select("app_key").eq("user_id", context.user.id).eq("app_key", "crm").maybeSingle();
    if (!data) throw redirect({ to: "/portal" });
  },
  component: CrmPage,
  head: () => ({
    meta: [
      { title: "myio CRM | Em breve" },
      { name: "description", content: "O aplicativo myio CRM está em desenvolvimento." },
      { property: "og:title", content: "myio CRM | Em breve" },
      { property: "og:description", content: "O aplicativo de relacionamento da plataforma myio ERP está em desenvolvimento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function CrmPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader logo={<MyioAppLogo appName="CRM" className="text-xl sm:text-2xl" />} />
      <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-3xl items-center justify-center px-4 py-12 text-center sm:px-6">
        <div>
          <span className="mx-auto flex h-20 w-20 items-center justify-center text-foreground"><CrmFunnelIcon className="h-16 w-16 stroke-[3]" /></span>
          <Badge variant="outline" className="mt-6">Em breve</Badge>
          <h1 className="mt-4 text-4xl font-extrabold">myio CRM</h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">Este aplicativo está sendo desenvolvido em paralelo e estará disponível aqui.</p>
        </div>
      </main>
    </div>
  );
}