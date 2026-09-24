import { createFileRoute, Link } from "@tanstack/react-router";
import { PendingForMe } from "@/components/approval-workflow";
import { MyioLogo } from "@/components/myio-logo";
import { Bell, CheckCircle2, CodeXml, Phone, ShieldCheck, ShoppingCart } from "lucide-react";
import { usePendingActions } from "@/hooks/use-pending-actions";
import { AppHeader } from "@/components/app-header";

export const Route = createFileRoute("/_authenticated/pendentes")({
  component: PendentesPage,
  head: () => ({
    meta: [
      { title: "Central de Pendências | myio ERP" },
      { name: "description", content: "Ações aguardando sua decisão nos aplicativos da plataforma myio ERP." },
      { property: "og:title", content: "Central de Pendências | myio ERP" },
      { property: "og:description", content: "Ações aguardando sua decisão nos aplicativos da plataforma myio ERP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PendentesPage() {
  const { data, isLoading } = usePendingActions();
  return (
    <div className="min-h-screen bg-background">
      <AppHeader logo={<MyioLogo className="text-xl sm:text-2xl" />} />
      <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Bell className="h-6 w-6" />Central de Pendências</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ações que aguardam sua decisão.</p>
        </div>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando pendências...</p> : (
          <div className="space-y-6">
            {(data?.total ?? 0) > 0 ? (
              <div className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
                {(data?.approvals ?? 0) > 0 ? <PendingLink icon={CheckCircle2} label="Aguardando minha aprovação" count={data?.approvals ?? 0} to="/pendentes" /> : null}
                {(data?.supplyQueue ?? 0) > 0 ? <PendingLink icon={ShoppingCart} label="Fila do Supply" count={data?.supplyQueue ?? 0} to="/dashboard" search={{ section: "queue" }} /> : null}
                {(data?.userDeletions ?? 0) > 0 ? <PendingLink icon={ShieldCheck} label="Exclusões de usuários aguardando decisão" count={data?.userDeletions ?? 0} to="/dashboard" search={{ section: "admin", subsection: "usuarios" }} /> : null}
                {(data?.codeItems ?? []).map((ticket) => <PendingLink key={ticket.ticketId} icon={CodeXml} label={`#${ticket.ticketNumber} · ${ticket.reason === "responder" ? "Responder ao Admin" : ticket.reason === "aceitar" ? "Confirmar atendimento" : "Ticket aguardando atendimento"}`} count={1} to="/development" search={{ ticket: ticket.ticketId }} />)}
                {(data?.supportCallItems ?? []).map((call) => <PendingLink key={call.callId} icon={Phone} label={`#${call.callNumber} · ${call.title}`} count={1} to="/chamados" search={{ chamado: call.callId }} />)}
              </div>
            ) : null}
            {(data?.approvals ?? 0) > 0 ? <section id="approvals"><PendingForMe /></section> : null}
            {(data?.total ?? 0) === 0 ? <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhuma pendência no momento.</p> : null}
          </div>
        )}
      </main>
    </div>
  );
}

function PendingLink({ icon: Icon, label, count, to, search }: { icon: typeof Bell; label: string; count: number; to: "/pendentes" | "/dashboard" | "/development" | "/chamados"; search?: { section: "admin"; subsection: "usuarios" } | { section: "queue" } | { ticket: string } | { chamado: string } }) {
  const content = <><Icon className="h-5 w-5 shrink-0" /><span className="min-w-0 flex-1 text-sm font-medium">{label}</span><span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-destructive px-2 text-xs font-bold text-destructive-foreground">{count > 99 ? "99+" : count}</span></>;
  if (to === "/pendentes") return <a href="#approvals" className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/10">{content}</a>;
  if (to === "/development") return <Link to="/development" search={(search && "ticket" in search) ? search : { ticket: undefined }} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/10">{content}</Link>;
  if (to === "/chamados") return <Link to="/chamados" search={(search && "chamado" in search) ? search : { chamado: undefined }} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/10">{content}</Link>;
  return <Link to="/dashboard" search={search && "section" in search ? { section: search.section, subsection: "subsection" in search ? search.subsection : undefined } : { section: "queue", subsection: undefined }} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/10">{content}</Link>;
}
