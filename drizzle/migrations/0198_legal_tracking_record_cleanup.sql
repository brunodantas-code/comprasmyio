CREATE FUNCTION public.cleanup_legal_record_tracking() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 DELETE FROM public.legal_action_observations WHERE action_id IN (SELECT id FROM public.legal_actions WHERE record_id=OLD.id);
 DELETE FROM public.legal_subject_logs WHERE record_id=OLD.id;
 RETURN OLD;
END $$;
CREATE TRIGGER cleanup_legal_record_tracking BEFORE DELETE ON public.legal_records FOR EACH ROW EXECUTE FUNCTION public.cleanup_legal_record_tracking();