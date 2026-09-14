ALTER TABLE public.purchase_orders
  ADD COLUMN budget_exceeded boolean NOT NULL DEFAULT false,
  ADD COLUMN budget_snapshot numeric,
  ADD COLUMN committed_before_snapshot numeric,
  ADD COLUMN projected_committed_snapshot numeric;

CREATE OR REPLACE FUNCTION public.get_project_budget_summaries()
RETURNS TABLE (
  project_id uuid,
  budget numeric,
  requested_total numeric,
  requested_percent numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.get_project_budget_summaries() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_project_budget_summaries() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_budget_summaries() TO service_role;

CREATE OR REPLACE FUNCTION public.set_purchase_order_budget_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_budget numeric;
  committed_before numeric;
BEGIN
  IF NEW.project_id IS NULL OR NEW.status = 'cancelado' THEN
    NEW.budget_exceeded := false;
    NEW.budget_snapshot := NULL;
    NEW.committed_before_snapshot := NULL;
    NEW.projected_committed_snapshot := NULL;
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.budget, 0)
    INTO project_budget
    FROM public.projects p
   WHERE p.id = NEW.project_id;

  SELECT COALESCE(SUM(po.estimated_value), 0)
    INTO committed_before
    FROM public.purchase_orders po
   WHERE po.project_id = NEW.project_id
     AND po.status <> 'cancelado'
     AND po.id IS DISTINCT FROM NEW.id;

  NEW.budget_snapshot := project_budget;
  NEW.committed_before_snapshot := committed_before;
  NEW.projected_committed_snapshot := committed_before + COALESCE(NEW.estimated_value, 0);
  NEW.budget_exceeded := project_budget > 0
    AND NEW.projected_committed_snapshot > project_budget;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_purchase_order_budget_flag ON public.purchase_orders;
CREATE TRIGGER trg_set_purchase_order_budget_flag
BEFORE INSERT OR UPDATE OF project_id, estimated_value, status
ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_purchase_order_budget_flag();

UPDATE public.purchase_orders po
SET
  budget_snapshot = p.budget,
  committed_before_snapshot = GREATEST(summary.requested_total - CASE WHEN po.status <> 'cancelado' THEN po.estimated_value ELSE 0 END, 0),
  projected_committed_snapshot = summary.requested_total,
  budget_exceeded = p.budget > 0 AND summary.requested_total > p.budget
FROM public.projects p
JOIN (
  SELECT project_id, COALESCE(SUM(estimated_value) FILTER (WHERE status <> 'cancelado'), 0) AS requested_total
  FROM public.purchase_orders
  WHERE project_id IS NOT NULL
  GROUP BY project_id
) summary ON summary.project_id = p.id
WHERE po.project_id = p.id
  AND po.status <> 'cancelado';