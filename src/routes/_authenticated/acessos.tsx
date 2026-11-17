import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { MyioPlatformLogo } from "@/components/myio-platform-logo";
import { AccessWorkspace, type AccessSection } from "@/components/access/access-workspace";
import { accessManagementOptions } from "@/components/access/access-context";
import { canOpenAccessManagement } from "@/lib/access-management";

export const Route = createFileRoute("/_authenticated/acessos")({
  validateSearch: (search: Record<string, unknown>): { section?: AccessSection; app?: string } => ({
    section: search.section === "usuarios" || search.section === "cadastro" || search.section === "perfis" ? search.section : undefined,
    app: typeof search.app === "string" ? search.app : undefined,
  }),
  beforeLoad: async ({ context }) => {
    const capabilities = await context.queryClient.ensureQueryData(accessManagementOptions);
    if (!canOpenAccessManagement(capabilities)) throw redirect({ to: "/portal" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(accessManagementOptions),
  component: AccessPage,
  head: () => ({ meta: [
    { title: "Acessos | Usuários e perfis myio ERP" },
    { name: "description", content: "Administração central de usuários, aplicativos e perfis de acesso por aplicativo no myio ERP." },
    { property: "og:title", content: "Acessos | Usuários e perfis myio ERP" },
    { property: "og:description", content: "Administração central de usuários, aplicativos e perfis de acesso do myio ERP." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function AccessPage() {
  const { data: capabilities } = useSuspenseQuery(accessManagementOptions);
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <div className="min-h-screen bg-background">
    <AppHeader logo={<MyioPlatformLogo className="h-10" />} />
    <main className="mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-6 sm:py-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold"><ShieldCheck className="size-6 shrink-0" />Acessos</h1>
      <AccessWorkspace capabilities={capabilities} section={search.section} app={search.app} onChange={change => void navigate({ search: change })} />
    </main>
  </div>;
}