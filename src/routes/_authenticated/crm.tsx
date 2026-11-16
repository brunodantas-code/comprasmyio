import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { MyioAppLogo } from "@/components/myio-app-logo";
import { CrmFunnelIcon } from "@/components/crm-funnel-icon";
import { AppHeader } from "@/components/app-header";
import { CRM_URL } from "@/lib/external-apps";

export const Route = createFileRoute("/_authenticated/crm")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_app_access").select("app_key").eq("user_id", context.user.id).eq("app_key", "crm").maybeSingle();
    if (!data) throw redirect({ to: "/portal" });
  },
  component: CrmPage,
  head: () => ({
    meta: [
      { title: "Acesso ao CRM | myio ERP" },
      { name: "description", content: "Acesso ao CRM comercial myio para vendas e relacionamento com clientes." },
      { property: "og:title", content: "Acesso ao CRM | myio ERP" },
      { property: "og:description", content: "Abra o CRM comercial myio a partir da plataforma ERP." },
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
          <h1 className="mt-4 text-4xl font-extrabold">myio CRM</h1>
          <Button asChild className="mt-6"><a href={CRM_URL} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" />Abrir CRM</a></Button>
        </div>
      </main>
    </div>
  );
}