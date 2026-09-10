import { createFileRoute, Link } from "@tanstack/react-router";
import { PendingForMe } from "@/components/approval-workflow";
import { Button } from "@/components/ui/button";
import { MyioLogo } from "@/components/myio-logo";

export const Route = createFileRoute("/_authenticated/pendentes")({
  component: PendentesPage,
  head: () => ({
    meta: [
      { title: "Pendentes comigo | myio supply" },
      { name: "description", content: "Approvals aguardando sua liberação no myio supply." },
      { property: "og:title", content: "Pendentes comigo | myio supply" },
      { property: "og:description", content: "Approvals aguardando sua liberação no myio supply." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PendentesPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link to="/dashboard" className="flex min-w-0 items-center font-semibold">
            <MyioLogo className="text-xl sm:text-2xl" />
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard">Voltar ao painel</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8">
        <h1 className="mb-4 text-xl font-semibold text-myio-purple">Approvals pendentes comigo</h1>
        <PendingForMe />
      </main>
    </div>
  );
}
