import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProjectBudgetSummary = {
  projectId: string;
  budget: number;
  requestedTotal: number;
  requestedPercent: number;
};

export const getProjectBudgetSummaries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: projects, error: projectsError }, { data: orders, error: ordersError }] = await Promise.all([
      supabaseAdmin.from("projects").select("id,budget"),
      supabaseAdmin.from("purchase_orders").select("project_id,estimated_value,status").not("project_id", "is", null),
    ]);
    if (projectsError) throw projectsError;
    if (ordersError) throw ordersError;

    const requestedByProject = new Map<string, number>();
    for (const order of orders ?? []) {
      if (!order.project_id || order.status === "cancelado") continue;
      requestedByProject.set(
        order.project_id,
        (requestedByProject.get(order.project_id) ?? 0) + Number(order.estimated_value ?? 0),
      );
    }

    return (projects ?? []).map((project): ProjectBudgetSummary => {
      const budget = Number(project.budget ?? 0);
      const requestedTotal = requestedByProject.get(project.id) ?? 0;
      return {
        projectId: project.id,
        budget,
        requestedTotal,
        requestedPercent: budget > 0 ? (requestedTotal / budget) * 100 : 0,
      };
    });
  });