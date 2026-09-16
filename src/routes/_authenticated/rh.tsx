import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowLeft, UsersRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MyioPlatformLogo } from "@/components/myio-platform-logo";

export const Route = createFileRoute("/_authenticated/rh")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_app_access").select("app_key").eq("user_id", context.user.id).eq("app_key", "rh").maybeSingle();
    if (!data) throw redirect({ to: "/portal" });
  },
  component: RhPage,
  head: () => ({
    meta: [
      { title: "myio RH | Em breve" },
      { name: "description", content: "O aplicativo myio RH para gestão de pessoas está em desenvolvimento." },
      { property: "og:title", content: "myio RH | Em breve" },
      { property: "og:description", content: "Gestão de Pessoas na plataforma myio ERP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function RhPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/portal"><MyioPlatformLogo className="h-9" /></Link>
          <Button asChild variant="outline" size="sm"><Link to="/portal"><ArrowLeft className="h-4 w-4" />Aplicativos</Link></Button>
        </div>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-3xl items-center justify-center px-4 py-12 text-center sm:px-6">
        <div>
          <span className="mx-auto flex h-20 w-20 items-center justify-center text-foreground">
            <UsersRound className="h-16 w-16 stroke-[1.6]" />
          </span>
          <Badge variant="outline" className="mt-6">Em breve</Badge>
          <h1 className="mt-4 text-4xl font-extrabold">myio RH</h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">Gestão de Pessoas</p>
        </div>
      </main>
    </div>
  );
}