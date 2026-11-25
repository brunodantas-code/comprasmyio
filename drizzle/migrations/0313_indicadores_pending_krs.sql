CREATE OR REPLACE FUNCTION public.indicadores_pending_krs(_all boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $fn$
DECLARE result jsonb; today date:=(now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão necessária' USING ERRCODE='42501'; END IF;
 IF _all AND NOT coalesce(public.is_access_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Acesso exclusivo para Admin' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.due_on NULLS LAST,x.metric_id),'[]'::jsonb) INTO result FROM (
  SELECT m.id AS metric_id,m.title,o.title AS objective_title,m.responsible_id,m.due_on,
   coalesce(max(c.recorded_at)::date,m.created_at::date) AS last_checkin,
   (m.due_on IS NOT NULL AND m.due_on<today) AS overdue,
   (coalesce(max(c.recorded_at)::date,m.created_at::date)<today-7) AS stale
  FROM public.indicadores_metrics m
  JOIN public.indicadores_objectives o ON o.id=m.objective_id
  JOIN public.indicadores_cycles cy ON cy.id=o.cycle_id AND NOT cy.archived AND cy.starts_on<=today AND cy.ends_on>=today
  LEFT JOIN public.indicadores_checkins c ON c.metric_id=m.id
  WHERE m.responsible_id IS NOT NULL AND (_all OR m.responsible_id=auth.uid())
   AND NOT (m.target_value IS NOT NULL AND m.current_value IS NOT NULL AND CASE WHEN m.target_value>=coalesce(m.initial_value,0) THEN m.current_value>=m.target_value ELSE m.current_value<=m.target_value END)
  GROUP BY m.id,o.title
 ) x WHERE x.overdue OR x.stale;
 RETURN result;
END $fn$;
REVOKE ALL ON FUNCTION public.indicadores_pending_krs(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.indicadores_pending_krs(boolean) TO authenticated;