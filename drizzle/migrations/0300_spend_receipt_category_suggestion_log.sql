DO $m$ DECLARE d text:=pg_get_functiondef('public.spend_action(text,jsonb)'::regprocedure); o text:='''confirmed'',true))'; BEGIN
 IF strpos(d,o)=0 THEN RAISE EXCEPTION 'receipt log not found'; END IF;
 EXECUTE replace(d,o,'''confirmed'',true,''category'',cat,''suggested_category'',nullif(_data->>''suggested_category'',''''),''category_change_confirmed'',coalesce((_data->>''category_change_confirmed'')::boolean,false)))');
END $m$;