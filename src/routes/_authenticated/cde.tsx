import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { MyioAppLogo } from "@/components/myio-app-logo";
import { AppHeader } from "@/components/app-header";
import { CdeWorkspace } from "@/components/cde/cde-workspace";

export const Route = createFileRoute("/_authenticated/cde")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("erp_admins").select("user_id").eq("user_id", context.user.id).maybeSingle();
    const { data: grant } = data ? { data: true } : await supabase.from("user_app_access").select("user_id").eq("user_id", context.user.id).eq("app_key", "cde").maybeSingle();
    if (!grant) throw redirect({ to: "/portal" });
  },
  component: CdePage,
  head: () => ({
    meta: [
      { title: "myio CDE | Padrões de interface do ERP" },
      { name: "description", content: "Ambiente de Desenvolvimento Colaborativo com o inventário e os padrões de botões, campos, filtros e ordenação do ERP." },
      { property: "og:title", content: "myio CDE | Padrões de interface do ERP" },
      { property: "og:description", content: "Consolide e escolha os padrões visuais usados em todos os apps myio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function CdePage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader manualApp="CDE" logo={<MyioAppLogo appName="CDE" className="text-xl sm:text-2xl" />} />
      <CdeWorkspace />
    </div>
  );
}
