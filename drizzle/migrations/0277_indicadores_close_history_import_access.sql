REVOKE ALL ON FUNCTION public.indicadores_import_okr(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.indicadores_import_okr(jsonb) TO service_role;
COMMENT ON FUNCTION public.indicadores_import_okr(jsonb) IS 'One-time historical import. Closed to app callers after verified load; identity map requires operator review.';
ALTER POLICY import_read ON public.indicadores_import_records TO authenticated USING (
 public.indicadores_role(auth.uid()) IS NOT NULL AND (
  source_table IN ('dimensions','team_members','team_member_dimensions','meetings','meeting_participants')
  OR public.indicadores_role(auth.uid())='admin'
  OR (source_table='objective_owners' AND EXISTS(SELECT 1 FROM public.indicadores_objectives o WHERE o.id::text=data->>'objective_id'))
 ));