ALTER TABLE public.development_tickets ADD COLUMN proposed_solution text;
ALTER TABLE public.development_ticket_logs ADD COLUMN event_type text;
ALTER TABLE public.development_ticket_logs ADD COLUMN observation_id uuid;
ALTER TABLE public.development_ticket_logs ADD COLUMN previous_note text;
CREATE OR REPLACE FUNCTION public.guard_code_solution()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prior_solution text;
BEGIN
 IF TG_OP='UPDATE' THEN prior_solution := OLD.proposed_solution; END IF;
 IF NEW.proposed_solution IS DISTINCT FROM prior_solution THEN
  IF auth.uid() IS NULL OR NOT private.is_code_admin(auth.uid()) OR NEW.status = 'excluido' THEN RAISE EXCEPTION 'Somente Admins do Code podem registrar a solução.' USING ERRCODE='42501'; END IF;
  IF length(COALESCE(NEW.proposed_solution,'')) > 4000 THEN RAISE EXCEPTION 'A solução deve ter no máximo 4.000 caracteres.'; END IF;
  NEW.proposed_solution := NULLIF(btrim(NEW.proposed_solution),'');
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER guard_code_solution BEFORE INSERT OR UPDATE OF proposed_solution ON public.development_tickets FOR EACH ROW EXECUTE FUNCTION public.guard_code_solution();
CREATE OR REPLACE FUNCTION public.log_code_solution()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.proposed_solution IS DISTINCT FROM OLD.proposed_solution THEN
  INSERT INTO public.development_ticket_logs(ticket_id,changed_by,previous_status,new_status,event_type,note,previous_note)
  VALUES(NEW.id,auth.uid(),OLD.status,NEW.status,'solution_updated',NEW.proposed_solution,OLD.proposed_solution);
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER log_code_solution AFTER UPDATE OF proposed_solution ON public.development_tickets FOR EACH ROW EXECUTE FUNCTION public.log_code_solution();
CREATE OR REPLACE FUNCTION public.save_code_observation(_ticket_id uuid, _text text, _observation_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ticket public.development_tickets%ROWTYPE; prior text; observation uuid := COALESCE(_observation_id,gen_random_uuid()); clean_text text := btrim(COALESCE(_text,''));
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_code_admin(auth.uid()) THEN RAISE EXCEPTION 'Somente Admins do Code podem registrar observações.' USING ERRCODE='42501'; END IF;
 IF length(clean_text) < 1 OR length(clean_text) > 4000 THEN RAISE EXCEPTION 'A observação deve conter de 1 a 4.000 caracteres.'; END IF;
 SELECT * INTO ticket FROM public.development_tickets WHERE id=_ticket_id FOR UPDATE;
 IF NOT FOUND OR ticket.status='excluido' THEN RAISE EXCEPTION 'Ticket indisponível para observações.'; END IF;
 IF _observation_id IS NOT NULL THEN
  SELECT note INTO prior FROM public.development_ticket_logs WHERE ticket_id=_ticket_id AND observation_id=_observation_id AND event_type IN ('observation_added','observation_edited') ORDER BY created_at DESC,id DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Observação não encontrada neste ticket.'; END IF;
  IF prior=clean_text THEN RETURN observation; END IF;
 END IF;
 INSERT INTO public.development_ticket_logs(ticket_id,changed_by,previous_status,new_status,event_type,observation_id,note,previous_note)
 VALUES(_ticket_id,auth.uid(),ticket.status,ticket.status,CASE WHEN _observation_id IS NULL THEN 'observation_added' ELSE 'observation_edited' END,observation,clean_text,prior);
 RETURN observation;
END;
$$;
REVOKE ALL ON FUNCTION public.save_code_observation(uuid,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_code_observation(uuid,text,uuid) TO authenticated;