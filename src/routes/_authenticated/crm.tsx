import { Suspense, useState } from "react";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { Building2, Gauge, KanbanSquare, ListChecks, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MyioAppLogo } from "@/components/myio-app-logo";
import { AppHeader } from "@/components/app-header";
import { AppNavigation } from "@/components/ui/app-navigation";
import { useAppMenuLayout } from "@/components/cde/cde-menu-type";
import { sortByMenuOrder, useMenuOrders } from "@/components/cde/menu-order";
import { crmOptions } from "@/components/crm/crm-data";
import { CrmWorkspace, type CrmSection } from "@/components/crm/crm-workspace";

export const Route = createFileRoute("/_authenticated/crm")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_app_access").select("app_key").eq("user_id", context.user.id).eq("app_key", "crm").maybeSingle();
    if (!data) throw redirect({ to: "/portal" });
  },
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(crmOptions()); },
  component: CrmPage,
  errorComponent: CrmError,
  head: () => ({
    meta: [
      { title: "CRM | Vendas e relacionamento myio" },
      { name: "description", content: "CRM comercial myio dentro do ERP: leads, empresas, contatos, funil e oportunidades." },
      { property: "og:title", content: "CRM | Vendas e relacionamento myio" },
      { property: "og:description", content: "Painel comercial, leads, empresas e funil de oportunidades da myio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function CrmPage() {
  const ml = useAppMenuLayout("CRM");
  const [section, setSection] = useState<CrmSection>("painel");
  const { data: menuOrders } = useMenuOrders();
  const tabs = sortByMenuOrder([
    { value: "painel" as const, label: "Painel", icon: Gauge },
    { value: "leads" as const, label: "Leads", icon: UserPlus },
    { value: "empresas" as const, label: "Empresas", icon: Building2 },
    { value: "funil" as const, label: "Funil", icon: KanbanSquare },
    { value: "oportunidades" as const, label: "Oportunidades", icon: ListChecks },
  ], menuOrders?.["CRM|Barra inferior"]);
  return (
    <div className="min-h-screen bg-background">
      <AppHeader logo={<MyioAppLogo appName="CRM" className="text-xl sm:text-2xl" />} />
      <main className={`mx-auto max-w-[1500px] px-4 pb-28 pt-6 sm:px-6 ${ml.main}`}>
        <Suspense fallback={<p className="text-muted-foreground">Carregando...</p>}><CrmWorkspace section={section} /></Suspense>
      </main>
      <AppNavigation className={ml.nav} aria-label="Navegação do CRM">
        <div className={`mx-auto grid max-w-lg grid-cols-5 items-stretch rounded-[1.75rem] border border-border bg-card/95 p-1.5 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/90 ${ml.grid}`}>
          {tabs.map(({ value, label, icon: Icon }) => {
            const active = section === value;
            return <Button key={value} type="button" variant="ghost" className={`h-auto min-w-0 rounded-[1.35rem] p-0 shadow-none ${active ? "!bg-primary/15 !text-primary hover:!bg-primary/20 hover:!text-primary" : "!bg-transparent !text-muted-foreground hover:!bg-muted hover:!text-foreground"}`} onClick={() => setSection(value)} aria-current={active ? "page" : undefined}><span className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1"><span className="menu-icon"><Icon className="h-5 w-5 shrink-0" /></span><span className="max-w-full truncate text-[10px] font-semibold leading-none">{label}</span></span></Button>;
          })}
        </div>
      </AppNavigation>
    </div>
  );
}
function CrmError() {
  const router = useRouter();
  return <div className="space-y-4 p-6" role="alert"><p>Não foi possível carregar o CRM.</p><Button onClick={() => void router.invalidate()}>Tentar novamente</Button><Button asChild variant="ghost"><Link to="/portal">Todos os apps</Link></Button></div>;
}
