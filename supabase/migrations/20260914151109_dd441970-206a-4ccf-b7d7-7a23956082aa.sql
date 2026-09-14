CREATE VIEW public.project_budget_summaries
WITH (security_invoker = false)
AS
SELECT
  p.id AS project_id,
  COALESCE(p.budget, 0) AS budget,
  COALESCE(SUM(po.estimated_value) FILTER (WHERE po.status <> 'cancelado'), 0) AS requested_total,
  CASE
    WHEN COALESCE(p.budget, 0) > 0 THEN
      ROUND((COALESCE(SUM(po.estimated_value) FILTER (WHERE po.status <> 'cancelado'), 0) / p.budget) * 100, 2)
    ELSE 0
  END AS requested_percent
FROM public.projects p
LEFT JOIN public.purchase_orders po ON po.project_id = p.id
GROUP BY p.id, p.budget;

REVOKE ALL ON public.project_budget_summaries FROM PUBLIC, anon;
GRANT SELECT ON public.project_budget_summaries TO authenticated;
GRANT ALL ON public.project_budget_summaries TO service_role;

REVOKE ALL ON FUNCTION public.set_purchase_order_budget_flag() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_purchase_order_budget_flag() TO service_role;

DROP FUNCTION public.get_project_budget_summaries();