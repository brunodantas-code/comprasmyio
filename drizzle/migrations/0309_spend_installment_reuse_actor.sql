DO $m$
DECLARE d text;
BEGIN
 SELECT pg_get_functiondef('public.spend_installment_reuse()'::regprocedure) INTO d;
 d:=replace(d,'VALUES(card,auth.uid(),','VALUES(card,coalesce(auth.uid(),(SELECT holder_id FROM public.spend_cards WHERE id=card)),');
 EXECUTE d;
END $m$;