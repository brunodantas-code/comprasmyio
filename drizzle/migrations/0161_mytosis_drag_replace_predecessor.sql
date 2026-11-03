CREATE OR REPLACE FUNCTION public.reposition_mytosis_node(_node_id uuid, _target_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE moved public.mytosis_nodes%ROWTYPE; target public.mytosis_nodes%ROWTYPE; destination uuid; old_style text; old_color text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.mytosis_can_edit(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão para reposicionar etapas.' USING ERRCODE='42501'; END IF;
 IF _node_id IS NULL OR _target_id IS NULL OR _node_id = _target_id THEN RAISE EXCEPTION 'Selecione outro box de destino.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('mytosis_reposition'));
 SELECT * INTO moved FROM public.mytosis_nodes WHERE id=_node_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Etapa não encontrada.'; END IF;
 SELECT * INTO target FROM public.mytosis_nodes WHERE id=_target_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Destino não encontrado.'; END IF;
 IF moved.parent_id IS NULL THEN RAISE EXCEPTION 'O box principal não pode ser movido para dentro de outro fluxo.'; END IF;
 IF moved.is_process IS DISTINCT FROM target.is_process THEN RAISE EXCEPTION 'Escolha um destino no mesmo tipo de fluxo.'; END IF;
 IF EXISTS (WITH RECURSIVE subtree AS (SELECT id FROM public.mytosis_nodes WHERE id=_node_id UNION SELECT n.id FROM public.mytosis_nodes n JOIN subtree s ON n.parent_id=s.id) SELECT 1 FROM subtree WHERE id=_target_id) THEN RAISE EXCEPTION 'Essa alteração criaria um ciclo na hierarquia.'; END IF;
 IF EXISTS (WITH RECURSIVE ancestors AS (SELECT parent_id AS id FROM public.mytosis_nodes WHERE id=_node_id UNION SELECT n.parent_id FROM public.mytosis_nodes n JOIN ancestors a ON n.id=a.id) SELECT 1 FROM ancestors WHERE id=_target_id) THEN
 DELETE FROM public.mytosis_links WHERE predecessor_id=_node_id AND successor_id=_target_id;
 END IF;
 IF EXISTS (WITH RECURSIVE reachable AS (SELECT successor_id AS id FROM public.mytosis_links WHERE predecessor_id=_node_id UNION SELECT l.successor_id FROM public.mytosis_links l JOIN reachable r ON l.predecessor_id=r.id) SELECT 1 FROM reachable WHERE id=_target_id) THEN RAISE EXCEPTION 'Essa ligação criaria um ciclo entre os boxes.'; END IF;
 destination := coalesce(target.parent_id,target.id);
 UPDATE public.mytosis_nodes SET parent_id=destination, position=(SELECT coalesce(max(position),-1)+1 FROM public.mytosis_nodes WHERE parent_id=destination AND id<>_node_id) WHERE id=_node_id;
 SELECT style,color INTO old_style,old_color FROM public.mytosis_links WHERE successor_id=_node_id AND predecessor_id<>_target_id LIMIT 1;
 DELETE FROM public.mytosis_links WHERE successor_id=_node_id AND predecessor_id<>_target_id;
 INSERT INTO public.mytosis_links(predecessor_id,successor_id,style,color) VALUES(_target_id,_node_id,coalesce(old_style,'arrow'),old_color) ON CONFLICT(predecessor_id,successor_id) DO NOTHING;
END; $$;
REVOKE ALL ON FUNCTION public.reposition_mytosis_node(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reposition_mytosis_node(uuid,uuid) TO authenticated;