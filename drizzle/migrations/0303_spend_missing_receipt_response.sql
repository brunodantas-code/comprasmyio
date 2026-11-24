CREATE OR REPLACE FUNCTION public.spend_resolve_missing_receipt(_line_id uuid,_requested_at timestamptz,_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l public.spend_lines; c public.spend_cards; n public.spend_notices;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão necessária' USING ERRCODE='42501'; END IF;
 IF _reason IS NULL OR _reason NOT IN ('lost','not_applicable') THEN RAISE EXCEPTION 'Selecione o motivo'; END IF;
 SELECT * INTO l FROM public.spend_lines WHERE id=_line_id FOR UPDATE;
 SELECT cards.* INTO c FROM public.spend_cards cards JOIN public.spend_statements s ON s.card_id=cards.id WHERE s.id=l.statement_id;
 IF l.id IS NULL OR c.holder_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Somente o portador pode responder' USING ERRCODE='42501'; END IF;
 IF l.status<>'adjustment' OR l.receipt_id IS NOT NULL OR l.payable_id IS NOT NULL THEN RAISE EXCEPTION 'Pedido já alterado; atualize a tela'; END IF;
 SELECT n0.* INTO n FROM public.spend_notices n0 WHERE n0.line_id=l.id AND EXISTS(SELECT 1 FROM public.spend_logs a WHERE a.card_id=c.id AND a.action='adjustment' AND a.details->>'line_id'=l.id::text AND a.created_at=n0.created_at) ORDER BY n0.created_at DESC,n0.id DESC LIMIT 1;
 IF n.id IS NULL OR n.created_at IS DISTINCT FROM _requested_at THEN RAISE EXCEPTION 'Há um pedido mais recente; atualize a tela'; END IF;
 IF EXISTS(SELECT 1 FROM public.spend_logs g WHERE g.card_id=c.id AND g.action='receipt_missing_response' AND g.details->>'notice_id'=n.id::text) THEN RETURN jsonb_build_object('ok',true); END IF;
 INSERT INTO public.spend_logs(card_id,actor_id,action,details) VALUES(c.id,auth.uid(),'receipt_missing_response',jsonb_build_object('line_id',l.id,'notice_id',n.id,'requested_at',n.created_at,'reason',_reason,'merchant',l.merchant,'amount',l.amount));
 RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.spend_resolve_missing_receipt(uuid,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.spend_resolve_missing_receipt(uuid,timestamptz,text) TO authenticated,service_role;
DO $$ DECLARE d text; o text:='WHERE l.status=''adjustment'' AND (_all OR c.holder_id=auth.uid())'; BEGIN
 SELECT pg_get_functiondef('public.spend_pending_adjustments(boolean)'::regprocedure) INTO d;
 IF position(o IN d)=0 THEN RAISE EXCEPTION 'Definition mismatch'; END IF;
 EXECUTE replace(d,o,o || ' AND NOT EXISTS(SELECT 1 FROM public.spend_logs response WHERE response.card_id=c.id AND response.action=''receipt_missing_response'' AND response.details->>''line_id''=l.id::text AND (response.details->>''requested_at'')::timestamptz=n.created_at)');
END $$;