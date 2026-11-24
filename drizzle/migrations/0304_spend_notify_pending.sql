CREATE OR REPLACE FUNCTION public.spend_pending_adjustments(_all boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão necessária' USING ERRCODE='42501'; END IF;
 IF _all AND NOT coalesce(public.is_access_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Acesso exclusivo para Admin' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO result FROM (
 SELECT l.id AS line_id,l.receipt_id,c.id AS card_id,c.holder_id,l.merchant,l.amount,l.date,'adjustment'::text AS status,n.kind,n.message,n.created_at AS requested_at,p.full_name AS requester_name,
 (SELECT max(g.created_at) FROM public.spend_logs g WHERE g.card_id=c.id AND g.action='receipt_updated' AND g.details->>'receipt_id'=l.receipt_id::text) AS corrected_at
 FROM public.spend_lines l JOIN public.spend_statements s ON s.id=l.statement_id JOIN public.spend_cards c ON c.id=s.card_id
 JOIN LATERAL (SELECT n0.message,n0.created_at,n0.created_by,a.action AS kind FROM public.spend_notices n0 JOIN public.spend_logs a ON a.card_id=c.id AND a.action IN ('notify','adjustment') AND a.details->>'line_id'=l.id::text AND a.created_at=n0.created_at WHERE n0.line_id=l.id ORDER BY n0.created_at DESC,n0.id DESC LIMIT 1) n ON true
 LEFT JOIN public.profiles p ON p.id=n.created_by
 WHERE (_all OR c.holder_id=auth.uid()) AND l.status<>'approved' AND l.payable_id IS NULL
 AND ((n.kind='adjustment' AND l.status='adjustment') OR (n.kind='notify' AND l.receipt_id IS NULL AND NOT l.receipt_not_applicable))
 AND NOT EXISTS(SELECT 1 FROM public.spend_logs response WHERE response.card_id=c.id AND response.action='receipt_missing_response' AND response.details->>'line_id'=l.id::text AND (response.details->>'requested_at')::timestamptz=n.created_at)
 AND NOT EXISTS(SELECT 1 FROM public.spend_logs g WHERE g.card_id=c.id AND g.action='receipt_updated' AND g.details->>'receipt_id'=l.receipt_id::text AND g.created_at>n.created_at)
 ) x; RETURN result;
END $$;
DO $$ DECLARE d text; BEGIN SELECT pg_get_functiondef('public.spend_resolve_missing_receipt(uuid,timestamptz,text)'::regprocedure) INTO d;
 d:=replace(d,'l.status<>''adjustment''','l.status NOT IN (''pending'',''adjustment'')');
 d:=replace(d,'a.action=''adjustment''','a.action IN (''notify'',''adjustment'')');
 EXECUTE d;
END $$;
REVOKE ALL ON FUNCTION public.spend_pending_adjustments(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.spend_pending_adjustments(boolean) TO authenticated,service_role;