CREATE FUNCTION public.pm_reorder_project_phases(_project uuid, _ids uuid[]) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE expected integer;
BEGIN
 IF _project IS NULL OR NOT public.pm_can_edit(_project) THEN RAISE EXCEPTION 'Sem autorização para ordenar as fases deste projeto'; END IF;
 PERFORM id FROM public.pm_phases WHERE project_id=_project ORDER BY id FOR UPDATE;
 SELECT count(*) INTO expected FROM public.pm_phases WHERE project_id=_project;
 IF _ids IS NULL OR cardinality(_ids)<>expected OR (SELECT count(DISTINCT x) FROM unnest(_ids) x)<>expected OR EXISTS(SELECT 1 FROM unnest(_ids) x WHERE NOT EXISTS(SELECT 1 FROM public.pm_phases WHERE id=x AND project_id=_project)) THEN RAISE EXCEPTION 'A lista de fases mudou. Atualize antes de ordenar.'; END IF;
 UPDATE public.pm_phases f SET position=u.ord-1 FROM unnest(_ids) WITH ORDINALITY u(id,ord) WHERE f.id=u.id AND f.project_id=_project AND f.position<>u.ord-1;
END $$;
REVOKE ALL ON FUNCTION public.pm_reorder_project_phases(uuid,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pm_reorder_project_phases(uuid,uuid[]) TO authenticated,service_role;