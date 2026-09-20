import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Home, ListTree, LogOut, ReceiptText, WalletCards } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyioCashFlowLogo } from "@/components/myio-cash-flow-logo";
import { PayablesTab } from "@/components/cash-flow/payables-tab";
import { ChartOfAccountsTab } from "@/components/cash-flow/chart-of-accounts-tab";
import { CashRegisterTab } from "@/components/cash-flow/cash-register-tab";
import { ThemeToggle } from "@/components/theme-toggle";

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link to="/portal" className="flex min-w-0 items-center" title="Voltar aos aplicativos"><MyioCashFlowLogo className="text-xl sm:text-2xl" /></Link>
          <div className="flex items-center gap-1"><Button asChild variant="outline" size="icon" title="Início"><Link to="/portal" aria-label="Início"><Home className="h-4 w-4" /></Link></Button><ThemeToggle /><Button variant="ghost" size="icon" onClick={signOut} title="Sair" aria-label="Sair"><LogOut className="h-4 w-4" /></Button></div>
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
        <p className="mb-6 text-muted-foreground">Planejamento, pagamentos e posição bancária em um só lugar.</p>
        <Tabs defaultValue="payables" className="space-y-5">
          <div className="no-scrollbar overflow-x-auto"><TabsList className="min-w-max"><TabsTrigger value="payables"><ReceiptText className="h-4 w-4" />Contas a pagar</TabsTrigger><TabsTrigger value="accounts"><ListTree className="h-4 w-4" />Plano de Contas</TabsTrigger><TabsTrigger value="cash"><WalletCards className="h-4 w-4" />Caixa</TabsTrigger></TabsList></div>
          <TabsContent value="payables"><PayablesTab userId={user.id} /></TabsContent>
          <TabsContent value="accounts"><ChartOfAccountsTab userId={user.id} /></TabsContent>
          <TabsContent value="cash"><CashRegisterTab userId={user.id} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}