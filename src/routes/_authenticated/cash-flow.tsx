import { createFileRoute, redirect } from "@tanstack/react-router";
import { ListTree, ReceiptText, WalletCards } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { MyioCashFlowLogo } from "@/components/myio-cash-flow-logo";
import { PayablesTab } from "@/components/cash-flow/payables-tab";
import { ChartOfAccountsTab } from "@/components/cash-flow/chart-of-accounts-tab";
import { CashRegisterTab } from "@/components/cash-flow/cash-register-tab";
import { AppHeader } from "@/components/app-header";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/cash-flow")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_app_access").select("app_key").eq("user_id", context.user.id).eq("app_key", "cash_flow").maybeSingle();
    if (!data) throw redirect({ to: "/portal" });
  },
  component: CashFlowPage,
  head: () => ({
    meta: [
      { title: "Gestão financeira | myio cash flow" },
      { name: "description", content: "Plano de Contas, pagamentos e movimentações bancárias no myio cash flow." },
      { property: "og:title", content: "Gestão financeira | myio cash flow" },
      { property: "og:description", content: "Plano de Contas, pagamentos e movimentações bancárias da plataforma myio ERP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function CashFlowPage() {
  const user = Route.useRouteContext().user;
  const [section, setSection] = useState("payables");
  const tabs = [
    { value: "payables", label: "Contas a pagar", icon: ReceiptText },
    { value: "accounts", label: "Plano de Contas", icon: ListTree },
    { value: "cash", label: "Caixa", icon: WalletCards },
  ];
  return (
    <div className="min-h-screen bg-background">
      <AppHeader logo={<MyioCashFlowLogo className="text-xl sm:text-2xl" />} />
      <main className="mx-auto max-w-[1500px] px-4 pb-28 pt-6 sm:px-6">
        <p className="mb-6 text-muted-foreground">Planejamento, pagamentos e posição bancária em um só lugar.</p>
        <Tabs value={section} onValueChange={setSection} className="space-y-5">
          <TabsContent value="payables"><PayablesTab userId={user.id} /></TabsContent>
          <TabsContent value="accounts"><ChartOfAccountsTab userId={user.id} /></TabsContent>
          <TabsContent value="cash"><CashRegisterTab userId={user.id} /></TabsContent>
        </Tabs>
      </main>
      <nav className="fixed inset-x-3 bottom-3 z-50" aria-label="Navegação do Cash Flow">
        <div className="mx-auto grid max-w-md grid-cols-3 items-stretch rounded-[1.75rem] border border-border bg-card/95 p-1.5 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/90">
          {tabs.map(({ value, label, icon: Icon }) => {
            const active = section === value;
            return <Button key={value} type="button" variant="ghost" className={`h-auto min-w-0 rounded-[1.35rem] p-0 shadow-none ${active ? "!bg-primary/15 !text-primary hover:!bg-primary/20 hover:!text-primary" : "!bg-transparent !text-muted-foreground hover:!bg-muted hover:!text-foreground"}`} onClick={() => setSection(value)} aria-current={active ? "page" : undefined}><span className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1"><Icon className="h-5 w-5 shrink-0" /><span className="max-w-full truncate text-[10px] font-semibold leading-none">{label}</span></span></Button>;
          })}
        </div>
      </nav>
    </div>
  );
}