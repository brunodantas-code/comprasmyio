import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { FileSignature, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MyioAppLogo } from "@/components/myio-app-logo";

export const Route = createFileRoute("/_authenticated/legal")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_app_access").select("app_key").eq("user_id", context.user.id).eq("app_key", "legal").maybeSingle();
    if (!data) throw redirect({ to: "/portal" });
  },
  component: LegalPage,
  head: () => ({
    meta: [
      { title: "myio Legal | Em breve" },
      { name: "description", content: "O aplicativo myio Legal está em desenvolvimento." },
      { property: "og:title", content: "myio Legal | Em breve" },
      { property: "og:description", content: "O aplicativo jurídico da plataforma myio ERP está em desenvolvimento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function LegalPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/portal"><MyioAppLogo appName="Legal" className="text-xl sm:text-2xl" /></Link>
          <div className="flex items-center gap-1"><Button asChild variant="outline" size="icon" title="Início"><Link to="/portal" aria-label="Início"><Home className="h-4 w-4" /></Link></Button></div>
        </div>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-3xl items-center justify-center px-4 py-12 text-center sm:px-6">
        <div>
          <span className="mx-auto flex h-20 w-20 items-center justify-center text-foreground"><FileSignature className="h-16 w-16 stroke-[1.8]" /></span>
          <Badge variant="outline" className="mt-6">Em breve</Badge>
          <h1 className="mt-4 text-4xl font-extrabold">myio Legal</h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">Este aplicativo está sendo desenvolvido em paralelo e estará disponível aqui.</p>
        </div>
      </main>
    </div>
  );
}