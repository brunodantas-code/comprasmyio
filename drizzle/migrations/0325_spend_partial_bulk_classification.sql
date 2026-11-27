DO $migration$
DECLARE d text; anchor text;
BEGIN
 SELECT pg_get_functiondef('public.spend_save_classification(jsonb)'::regprocedure) INTO d;
 anchor:='resolved:=public.spend_review_project(l.id,p,_data->''project_reviews''->(l.id::text));';
 IF strpos(d,anchor)=0 THEN RAISE EXCEPTION 'Project review anchor missing'; END IF;
 d:=replace(d,anchor,'IF _data ? ''project_id'' THEN resolved:=public.spend_review_project(l.id,p,_data->''project_reviews''->(l.id::text)); ELSE resolved:=l.project_id; END IF;');
 anchor:='UPDATE public.spend_lines SET account_id=a,cost_center_id=c,project_id=resolved,';
 IF strpos(d,anchor)=0 THEN RAISE EXCEPTION 'Classification update anchor missing'; END IF;
 d:=replace(d,anchor,'UPDATE public.spend_lines SET account_id=CASE WHEN _data ? ''account_id'' THEN a ELSE l.account_id END,cost_center_id=CASE WHEN _data ? ''cost_center_id'' THEN c ELSE l.cost_center_id END,project_id=resolved,');
 anchor:='myio_cnpj=CASE WHEN l.receipt_id IS NULL THEN NULL WHEN _data ? ''myio_cnpj'' THEN (_data->>''myio_cnpj'')::boolean ELSE myio_cnpj END,';
 IF strpos(d,anchor)=0 THEN RAISE EXCEPTION 'Receipt CNPJ anchor missing'; END IF;
 d:=replace(d,anchor,'myio_cnpj=CASE WHEN NOT (_data ? ''myio_cnpj'') THEN l.myio_cnpj WHEN l.receipt_id IS NULL THEN NULL ELSE (_data->>''myio_cnpj'')::boolean END,');
 d:=replace(d,'''account_id'',a,''cost_center_id'',c,''project_id'',resolved,','''account_id'',l.account_id,''cost_center_id'',l.cost_center_id,''project_id'',l.project_id,');
 EXECUTE d;
END $migration$;
REVOKE ALL ON FUNCTION public.spend_save_classification(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.spend_save_classification(jsonb) TO authenticated;