DO $m$ DECLARE d text := pg_get_functiondef('public.spend_action(text,jsonb)'::regprocedure); o text := 'IF receipt.holder_id IS DISTINCT FROM auth.uid() OR receipt.card_id'; BEGIN
 IF position(o in d)=0 THEN RAISE EXCEPTION 'trecho não encontrado'; END IF;
 EXECUTE replace(d, o, 'IF (receipt.holder_id IS DISTINCT FROM auth.uid() AND r<>''finance'') OR receipt.card_id');
END $m$;