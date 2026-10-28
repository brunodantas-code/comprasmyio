CREATE OR REPLACE FUNCTION public.edit_code_message(_message_id uuid, _text text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE msg public.development_ticket_messages%ROWTYPE; ticket public.development_tickets%ROWTYPE; clean text := btrim(coalesce(_text,''));
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado.' USING ERRCODE='42501'; END IF;
 IF clean = '' OR length(clean) > 4000 THEN RAISE EXCEPTION 'Texto deve ter entre 1 e 4000 caracteres.'; END IF;
 SELECT * INTO msg FROM public.development_ticket_messages WHERE id=_message_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Mensagem não encontrada.'; END IF;
 IF msg.author_id <> auth.uid() THEN RAISE EXCEPTION 'Somente o autor pode editar esta mensagem.' USING ERRCODE='42501'; END IF;
 SELECT * INTO ticket FROM public.development_tickets WHERE id=msg.ticket_id;
 IF ticket.status IN ('concluido','excluido') THEN RAISE EXCEPTION 'Chamado encerrado não permite edição.'; END IF;
 IF clean = msg.message THEN RETURN; END IF;
 UPDATE public.development_ticket_messages SET message=clean WHERE id=_message_id;
 INSERT INTO public.development_ticket_logs(ticket_id,changed_by,previous_status,new_status,event_type,note,previous_note)
 VALUES(msg.ticket_id,auth.uid(),ticket.status,ticket.status,CASE WHEN msg.message_type='question' THEN 'question_edited' ELSE 'answer_edited' END,clean,msg.message);
END;
$function$;
REVOKE ALL ON FUNCTION public.edit_code_message(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.edit_code_message(uuid,text) TO authenticated;
