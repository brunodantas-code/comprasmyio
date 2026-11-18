ALTER TABLE public.pm_projects ADD COLUMN planned_end date;
ALTER TABLE public.pm_projects ADD CONSTRAINT pm_project_target_dates CHECK (planned_end IS NULL OR planned_end >= start_date);
ALTER TABLE public.pm_phases ADD COLUMN planned_start date, ADD COLUMN planned_end date;
ALTER TABLE public.pm_phases ADD CONSTRAINT pm_phase_target_dates CHECK (planned_start IS NULL OR planned_end IS NULL OR planned_end >= planned_start);
CREATE FUNCTION public.pm_reorder_phase_tasks(_phase uuid, _ids uuid[]) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE p uuid; expected integer;
BEGIN
 SELECT project_id INTO p FROM public.pm_phases WHERE id=_phase FOR UPDATE;
 IF p IS NULL OR NOT public.pm_can_edit(p) THEN RAISE EXCEPTION 'Sem autorização para ordenar esta fase'; END IF;
 PERFORM id FROM public.pm_tasks WHERE phase_id=_phase ORDER BY id FOR UPDATE;
 SELECT count(*) INTO expected FROM public.pm_tasks WHERE phase_id=_phase;
 IF _ids IS NULL OR cardinality(_ids)<>expected OR (SELECT count(DISTINCT x) FROM unnest(_ids) x)<>expected OR EXISTS(SELECT 1 FROM unnest(_ids) x WHERE NOT EXISTS(SELECT 1 FROM public.pm_tasks WHERE id=x AND phase_id=_phase)) THEN RAISE EXCEPTION 'A lista de tarefas mudou. Atualize antes de ordenar.'; END IF;
 UPDATE public.pm_tasks t SET position=u.ord-1 FROM unnest(_ids) WITH ORDINALITY u(id,ord) WHERE t.id=u.id AND t.phase_id=_phase AND t.position<>u.ord-1;
END $$;
REVOKE ALL ON FUNCTION public.pm_reorder_phase_tasks(uuid,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pm_reorder_phase_tasks(uuid,uuid[]) TO authenticated,service_role;