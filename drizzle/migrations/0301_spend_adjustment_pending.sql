CREATE OR REPLACE FUNCTION public.spend_pending_adjustments(_all boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão necessária' USING ERRCODE='42501'; END IF;
 IF _all AND NOT coalesce(public.is_access_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Acesso exclusivo para Admin' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) INTO result FROM (
 SELECT l.id AS line_id,l.receipt_id,c.id AS card_id,c.holder_id,l.merchant,l.amount,l.date,l.status,n.message,n.created_at AS requested_at,p.full_name AS requester_name,
 (SELECT max(g.created_at) FROM public.spend_logs g WHERE g.card_id=c.id AND g.action='receipt_updated' AND g.details->>'receipt_id'=l.receipt_id::text) AS corrected_at
 FROM public.spend_lines l JOIN public.spend_statements s ON s.id=l.statement_id JOIN public.spend_cards c ON c.id=s.card_id
 JOIN LATERAL (SELECT message,created_at,created_by FROM public.spend_notices WHERE line_id=l.id ORDER BY created_at DESC,id DESC LIMIT 1) n ON true
 LEFT JOIN public.profiles p ON p.id=n.created_by
 WHERE l.status='adjustment' AND (_all OR c.holder_id=auth.uid())
 AND NOT EXISTS(SELECT 1 FROM public.spend_logs g WHERE g.card_id=c.id AND g.action='receipt_updated' AND g.details->>'receipt_id'=l.receipt_id::text AND g.created_at>n.created_at)
 ) x;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.spend_pending_adjustments(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.spend_pending_adjustments(boolean) TO authenticated,service_role;
COMMENT ON FUNCTION public.spend_pending_adjustments(boolean) IS 'Identity-scoped adjustment summaries; only access admins may request all. No private receipt paths are returned. Saved audited corrections resolve the request without deleting history.';