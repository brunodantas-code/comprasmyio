CREATE OR REPLACE FUNCTION public.split_mytosis_node(_node_id uuid, _count integer)
RETURNS uuid[] LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE source public.mytosis_nodes%ROWTYPE; new_id uuid; ids uuid[] := ARRAY[]::uuid[]; target_parent uuid; base_position integer; i integer;
BEGIN
 IF auth.uid() IS NULL OR NOT public.mytosis_can_edit(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão para criar etapas.'; END IF;
 IF _count IS NULL OR _count < 1 OR _count > 100 THEN RAISE EXCEPTION 'Informe uma quantidade inteira entre 1 e 100 etapas.'; END IF;
 SELECT * INTO source FROM public.mytosis_nodes WHERE id = _node_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Box não encontrado.'; END IF;
 target_parent := coalesce(source.parent_id, source.id);
 PERFORM id FROM public.mytosis_nodes WHERE id = target_parent FOR UPDATE;
 SELECT coalesce(max(position), -1) + 1 INTO base_position FROM public.mytosis_nodes WHERE parent_id = target_parent;
 FOR i IN 1.._count LOOP
  INSERT INTO public.mytosis_nodes (kind,title,parent_id,responsible_id,due_date,is_process,position)
  VALUES ('task','Etapa ' || i,target_parent,coalesce(source.responsible_id,auth.uid()),CASE WHEN source.is_process THEN NULL ELSE source.due_date END,source.is_process,base_position+i-1)
  RETURNING id INTO new_id;
  INSERT INTO public.mytosis_links(predecessor_id,successor_id,style) VALUES(source.id,new_id,'arrow');
  ids := array_append(ids,new_id);
 END LOOP;
 RETURN ids;
END; $$;
REVOKE ALL ON FUNCTION public.split_mytosis_node(uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.split_mytosis_node(uuid,integer) TO authenticated;