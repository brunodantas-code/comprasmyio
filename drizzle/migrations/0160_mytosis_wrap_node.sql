CREATE OR REPLACE FUNCTION public.wrap_mytosis_node(_new_id uuid, _node_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE target public.mytosis_nodes%ROWTYPE; fresh public.mytosis_nodes%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR NOT public.mytosis_can_edit(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão para editar etapas.'; END IF;
 SELECT * INTO target FROM public.mytosis_nodes WHERE id = _node_id FOR UPDATE;
 IF NOT FOUND OR target.parent_id IS NULL THEN RAISE EXCEPTION 'Box inválido para inserir etapa acima.'; END IF;
 SELECT * INTO fresh FROM public.mytosis_nodes WHERE id = _new_id FOR UPDATE;
 IF NOT FOUND OR fresh.parent_id IS DISTINCT FROM target.parent_id OR fresh.id = target.id THEN RAISE EXCEPTION 'Nova etapa inválida.'; END IF;
 DELETE FROM public.mytosis_links WHERE (predecessor_id = _new_id AND successor_id = _node_id) OR (predecessor_id = _node_id AND successor_id = _new_id);
 INSERT INTO public.mytosis_links (predecessor_id, successor_id, style, color)
   SELECT _new_id, successor_id, style, color FROM public.mytosis_links WHERE predecessor_id = _node_id AND successor_id <> _new_id
   ON CONFLICT DO NOTHING;
 INSERT INTO public.mytosis_links (predecessor_id, successor_id, style, color)
   SELECT predecessor_id, _new_id, style, color FROM public.mytosis_links WHERE successor_id = _node_id AND predecessor_id <> _new_id
   ON CONFLICT DO NOTHING;
 DELETE FROM public.mytosis_links WHERE predecessor_id = _node_id OR successor_id = _node_id;
 UPDATE public.mytosis_nodes SET position = target.position WHERE id = _new_id;
 UPDATE public.mytosis_nodes SET parent_id = _new_id, position = 0 WHERE id = _node_id;
END; $$;
REVOKE ALL ON FUNCTION public.wrap_mytosis_node(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wrap_mytosis_node(uuid,uuid) TO authenticated;