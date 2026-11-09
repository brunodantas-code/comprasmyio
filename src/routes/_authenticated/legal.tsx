import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { MyioAppLogo } from "@/components/myio-app-logo";
import { AppHeader } from "@/components/app-header";
import { LegalWorkspace, legalRecordsOptions } from "@/components/legal/legal-workspace";
import { legalTrackingOptions } from '@/lib/legal-actions';

export const Route = createFileRoute("/_authenticated/legal")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_app_access").select("app_key").eq("user_id", context.user.id).eq("app_key", "legal").maybeSingle();
    if (!data) throw redirect({ to: "/portal" });
  },
  loader: async ({ context }) => { await Promise.all([context.queryClient.ensureQueryData(legalRecordsOptions), context.queryClient.ensureQueryData(legalTrackingOptions)]); },
  component: LegalPage,
  head: () => ({
    meta: [
      { title: "myio Legal | Contratos, atas e documentos" },
      { name: "description", content: "Contratos de clientes e fornecedores, atas de reunião assinadas e documentos padrão da Companhia." },
      { property: "og:title", content: "myio Legal | Contratos, atas e documentos" },
      { property: "og:description", content: "Organize assuntos, deliberações e assinaturas das atas com PDFs privados no myio Legal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function LegalPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader logo={<MyioAppLogo appName="Legal" className="text-xl sm:text-2xl" />} />
      <LegalWorkspace />
    </div>
  );
}