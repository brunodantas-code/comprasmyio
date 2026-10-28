CREATE OR REPLACE FUNCTION public.save_code_observation(_ticket_id uuid, _text text, _observation_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ticket public.development_tickets%ROWTYPE; prior text; observation uuid := COALESCE(_observation_id,gen_random_uuid()); clean_text text := btrim(COALESCE(_text,''));
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_code_admin(auth.uid()) THEN RAISE EXCEPTION 'Somente Admins do Code podem registrar observações.' USING ERRCODE='42501'; END IF;
 IF length(clean_text) < 1 OR length(clean_text) > 4000 THEN RAISE EXCEPTION 'A observação deve conter de 1 a 4.000 caracteres.'; END IF;
 SELECT * INTO ticket FROM public.development_tickets WHERE id=_ticket_id FOR UPDATE;
 IF NOT FOUND OR ticket.status='excluido' THEN RAISE EXCEPTION 'Ticket indisponível para observações.'; END IF;
 IF _observation_id = _ticket_id THEN
  prior := ticket.admin_notes;
  IF prior IS NULL THEN RAISE EXCEPTION 'Observação anterior não encontrada.'; END IF;
 ELSIF _observation_id IS NOT NULL THEN
  SELECT note INTO prior FROM public.development_ticket_logs WHERE ticket_id=_ticket_id AND observation_id=_observation_id AND event_type IN ('observation_added','observation_edited') ORDER BY created_at DESC,id DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Observação não encontrada neste ticket.'; END IF;
 END IF;
 IF prior=clean_text THEN RETURN observation; END IF;
 INSERT INTO public.development_ticket_logs(ticket_id,changed_by,previous_status,new_status,event_type,observation_id,note,previous_note)
 VALUES(_ticket_id,auth.uid(),ticket.status,ticket.status,CASE WHEN _observation_id IS NULL THEN 'observation_added' ELSE 'observation_edited' END,observation,clean_text,prior);
 RETURN observation;
END;
$$;