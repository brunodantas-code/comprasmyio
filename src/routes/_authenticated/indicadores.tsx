import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { IndicadoresDashboard } from "@/components/indicadores/dashboard";
import { indicadoresOptions } from "@/components/indicadores/data";
export const Route = createFileRoute("/_authenticated/indicadores")({
  beforeLoad: async ({ context }) => {
    const r = await supabase.rpc("indicadores_role", { _user_id: context.user.id });
    if (r.error) throw r.error;
    if (!r.data) throw redirect({ to: "/portal" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(indicadoresOptions),
  component: IndicadoresDashboard,
  head: () => ({
    meta: [
      { title: "myio Indicadores | OKRs, KPIs e check-ins" },
      {
        name: "description",
        content:
          "Objetivos alinhados em cascata, indicadores contínuos, ciclos e acompanhamento semanal de resultados.",
      },
      { property: "og:title", content: "myio Indicadores | OKRs, KPIs e check-ins" },
      {
        property: "og:description",
        content:
          "Progresso estratégico, indicadores de desempenho e histórico dos check-ins da myio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
