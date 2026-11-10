CREATE OR REPLACE FUNCTION public.legal_action_initial_order() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 SELECT coalesce(max(coalesce(display_order,sequence)),0)+1 INTO NEW.display_order FROM public.legal_actions WHERE record_id=NEW.record_id AND subject_id=NEW.subject_id AND NOT archived;
 RETURN NEW;
END $$;
CREATE TRIGGER zz_legal_action_initial_order BEFORE INSERT ON public.legal_actions FOR EACH ROW EXECUTE FUNCTION public.legal_action_initial_order();