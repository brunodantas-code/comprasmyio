DO $do$
DECLARE d text := pg_get_functiondef('public.spend_action(text,jsonb)'::regprocedure);
 old text := $o$WHERE id=(_data->>'card_id')::uuid AND active; path:=_data->>'file_path';$o$;
 neu text := $n$WHERE id=(_data->>'card_id')::uuid AND (active OR EXISTS(SELECT 1 FROM public.spend_receipts er WHERE er.id=nullif(_data->>'id','')::uuid AND er.card_id=(_data->>'card_id')::uuid)); path:=_data->>'file_path';$n$;
BEGIN
 IF position(old in d)=0 THEN RAISE EXCEPTION 'spend_action receipt card check not found'; END IF;
 EXECUTE replace(d, old, neu);
END $do$;