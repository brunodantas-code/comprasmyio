CREATE OR REPLACE FUNCTION public.delete_code_observation(_ticket_id uuid, _observation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE ticket public.development_tickets%ROWTYPE; prior text; last_event text;
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_code_admin(auth.uid()) THEN RAISE EXCEPTION 'Somente Admins do Code podem excluir observações.' USING ERRCODE='42501'; END IF;
 SELECT * INTO ticket FROM public.development_tickets WHERE id=_ticket_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Ticket não encontrado.'; END IF;
 IF _observation_id = _ticket_id THEN
  prior := ticket.admin_notes;
  IF prior IS NULL THEN RAISE EXCEPTION 'Observação anterior não encontrada.'; END IF;
  UPDATE public.development_tickets SET admin_notes = NULL WHERE id=_ticket_id;
 ELSE
  SELECT note, event_type INTO prior, last_event FROM public.development_ticket_logs WHERE ticket_id=_ticket_id AND observation_id=_observation_id AND event_type IN ('observation_added','observation_edited','observation_deleted') ORDER BY created_at DESC,id DESC LIMIT 1;
  IF NOT FOUND OR last_event='observation_deleted' THEN RAISE EXCEPTION 'Observação não encontrada neste ticket.'; END IF;
 END IF;
 INSERT INTO public.development_ticket_logs(ticket_id,changed_by,previous_status,new_status,event_type,observation_id,note,previous_note)
 VALUES(_ticket_id,auth.uid(),ticket.status,ticket.status,'observation_deleted',_observation_id,NULL,prior);
END;
$function$;
REVOKE ALL ON FUNCTION public.delete_code_observation(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_code_observation(uuid,uuid) TO authenticated;