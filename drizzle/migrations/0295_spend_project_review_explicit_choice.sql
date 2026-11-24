DO $migration$
DECLARE d text; anchor text;
BEGIN
 SELECT pg_get_functiondef('public.spend_review_project(uuid,uuid,jsonb)'::regprocedure) INTO d;
 anchor:='choice:=_review->>''choice'';';
 IF strpos(d,anchor)=0 THEN RAISE EXCEPTION 'Project choice anchor missing'; END IF;
 d:=replace(d,anchor,$patch$choice:=_review->>'choice';
 IF choice IS NULL OR choice NOT IN ('holder','finance','none') THEN RAISE EXCEPTION 'Escolha e confirme o projeto da despesa'; END IF;$patch$);
 EXECUTE d;
END $migration$;