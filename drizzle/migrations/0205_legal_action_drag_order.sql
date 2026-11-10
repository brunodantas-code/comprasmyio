ALTER TABLE public.legal_actions ADD COLUMN display_order integer;
CREATE OR REPLACE FUNCTION public.legal_reorder_actions(p_record_id uuid, p_subject_id text, p_action_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE expected_ids uuid[]; changed_count integer; actor text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Acesso não autorizado'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(p_record_id::text||p_subject_id));
 SELECT array_agg(id ORDER BY id) INTO expected_ids FROM public.legal_actions WHERE record_id=p_record_id AND subject_id=p_subject_id AND NOT archived;
 IF expected_ids IS NULL OR expected_ids IS DISTINCT FROM (SELECT array_agg(id ORDER BY id) FROM unnest(p_action_ids) id) THEN RAISE EXCEPTION 'A lista de ações mudou. Atualize a ata antes de ordenar.'; END IF;
 UPDATE public.legal_actions a SET display_order=o.position FROM unnest(p_action_ids) WITH ORDINALITY o(id,position) WHERE a.id=o.id AND a.record_id=p_record_id AND a.subject_id=p_subject_id;
 GET DIAGNOSTICS changed_count = ROW_COUNT;
 IF changed_count<>cardinality(p_action_ids) THEN RAISE EXCEPTION 'Não foi possível ordenar todas as ações'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.legal_reorder_actions(uuid,text,uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.legal_reorder_actions(uuid,text,uuid[]) TO authenticated;
CREATE OR REPLACE FUNCTION public.audit_legal_action_order() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor text;
BEGIN
 IF NEW.display_order IS DISTINCT FROM OLD.display_order THEN
 SELECT full_name INTO actor FROM public.profiles WHERE id=auth.uid();
 INSERT INTO public.legal_subject_logs(record_id,subject_id,action_id,actor_id,actor_name,text) VALUES(NEW.record_id,NEW.subject_id,NEW.id,auth.uid(),coalesce(actor,'Usuário'),'Ordem da ação alterada: '||NEW.title||E'\nPosição anterior: '||coalesce(OLD.display_order,OLD.sequence)||E'\nNova posição: '||NEW.display_order);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER audit_legal_action_order AFTER UPDATE OF display_order ON public.legal_actions FOR EACH ROW EXECUTE FUNCTION public.audit_legal_action_order();