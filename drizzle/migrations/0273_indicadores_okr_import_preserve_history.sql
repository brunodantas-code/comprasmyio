CREATE TABLE public.indicadores_import_records (source_table text NOT NULL, source_id uuid NOT NULL, data jsonb NOT NULL, PRIMARY KEY(source_table,source_id));
GRANT SELECT ON public.indicadores_import_records TO authenticated; GRANT ALL ON public.indicadores_import_records TO service_role;
ALTER TABLE public.indicadores_import_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY import_read ON public.indicadores_import_records FOR SELECT TO authenticated USING(public.indicadores_role(auth.uid()) IS NOT NULL AND (source_table NOT IN('profiles','user_roles') OR public.indicadores_role(auth.uid())='admin'));
ALTER TABLE public.indicadores_objectives ADD COLUMN source_metadata jsonb;
ALTER TABLE public.indicadores_metrics ADD COLUMN source_metadata jsonb;
ALTER TABLE public.indicadores_checkins ADD COLUMN source_metadata jsonb;
ALTER TABLE public.indicadores_metrics ALTER COLUMN responsible_id DROP NOT NULL;
ALTER TABLE public.indicadores_checkins ALTER COLUMN recorded_by DROP NOT NULL;
ALTER TABLE public.indicadores_checkins ALTER COLUMN confidence DROP NOT NULL;
CREATE OR REPLACE FUNCTION public.indicadores_import_okr(_payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tbl text; rows jsonb; r jsonb; actor uuid:=auth.uid(); v_id uuid; cycle uuid; q int; yr int; creator uuid; responsible uuid; metadata jsonb; identity_map jsonb; n int:=0;
BEGIN
 IF actor IS NULL OR public.indicadores_role(actor) IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Somente Admin de Indicadores importa históricos.'; END IF;
 identity_map:=_payload->'identity_map';
 IF EXISTS(SELECT 1 FROM jsonb_each_text(identity_map) m WHERE NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=m.value::uuid AND p.deleted_at IS NULL)) THEN RAISE EXCEPTION 'Identidade ERP indisponível.'; END IF;
 FOR tbl,rows IN SELECT key,value FROM jsonb_each(_payload->'tables') LOOP
  IF tbl NOT IN('dimensions','team_members','team_member_dimensions','objectives','objective_owners','key_results','progress_updates','meetings','meeting_participants','profiles','user_roles') OR jsonb_typeof(rows)<>'array' THEN RAISE EXCEPTION 'Tabela de importação inválida.'; END IF;
  FOR r IN SELECT value FROM jsonb_array_elements(rows) LOOP
   INSERT INTO public.indicadores_import_records VALUES(tbl,(r->>'id')::uuid,r) ON CONFLICT DO NOTHING;
   n:=n+1;
  END LOOP;
 END LOOP;
 FOR r IN SELECT value FROM jsonb_array_elements(coalesce(_payload->'tables'->'objectives','[]')) LOOP
  v_id:=(r->>'id')::uuid;
  IF EXISTS(SELECT 1 FROM public.indicadores_objectives WHERE id=v_id) THEN CONTINUE; END IF;
  yr:=(r->>'year')::int;q:=right(r->>'quarter',1)::int;
  IF q NOT BETWEEN 1 AND 4 OR yr NOT BETWEEN 2000 AND 2100 THEN RAISE EXCEPTION 'Período inválido.'; END IF;
  cycle:=md5('okr-tracker/'||yr||'/'||q)::uuid;
  INSERT INTO public.indicadores_cycles(id,name,starts_on,ends_on,created_by) VALUES(cycle,'Q'||q||' '||yr,make_date(yr,(q-1)*3+1,1),(make_date(yr,(q-1)*3+1,1)+interval '3 months'-interval '1 day')::date,actor) ON CONFLICT DO NOTHING;
  creator:=(identity_map->>(r->>'user_id'))::uuid;
  IF creator IS NULL THEN RAISE EXCEPTION 'Autor do objetivo não vinculado.'; END IF;
  SELECT (identity_map->>(ir.data->>'team_member_id'))::uuid INTO responsible FROM public.indicadores_import_records ir WHERE ir.source_table='objective_owners' AND ir.data->>'objective_id'=v_id::text AND (ir.data->>'is_primary')::boolean LIMIT 1;
  IF responsible IS NULL THEN responsible:=(identity_map->>(r->>'owner'))::uuid; END IF;
  metadata:=r||jsonb_build_object('origin','okr_tracker','responsible_name',r->>'owner');
  PERFORM set_config('request.jwt.claim.sub',creator::text,true);
  INSERT INTO public.indicadores_objectives(id,title,description,cycle_id,scope,alignment_name,responsible_id,created_by,created_at,source_metadata)
   VALUES(v_id,r->>'title',r->>'description',cycle,'departamento',(SELECT data->>'name' FROM public.indicadores_import_records WHERE source_table='dimensions' AND source_id=(r->>'dimension_id')::uuid),responsible,creator,(r->>'created_at')::timestamptz,metadata);
 END LOOP;
 FOR r IN SELECT value FROM jsonb_array_elements(coalesce(_payload->'tables'->'key_results','[]')) LOOP
  v_id:=(r->>'id')::uuid;
  IF EXISTS(SELECT 1 FROM public.indicadores_metrics WHERE id=v_id) THEN CONTINUE; END IF;
  SELECT created_by INTO creator FROM public.indicadores_objectives WHERE id=(r->>'objective_id')::uuid;
  responsible:=(identity_map->>(r->>'owner'))::uuid;
  metadata:=r||jsonb_build_object('origin','okr_tracker','responsible_name',r->>'owner','initial_value_known',false);
  PERFORM set_config('request.jwt.claim.sub',creator::text,true);
  INSERT INTO public.indicadores_metrics(id,title,kind,objective_id,responsible_id,measure,target_value,current_value,unit,created_by,created_at,source_metadata)
   VALUES(v_id,r->>'title','kr',(r->>'objective_id')::uuid,responsible,CASE r->>'unit' WHEN '%' THEN 'percentage' WHEN 'R$' THEN 'currency' ELSE 'number' END,(r->>'target')::numeric,(r->>'current_value')::numeric,r->>'unit',creator,(r->>'created_at')::timestamptz,metadata);
 END LOOP;
 FOR r IN SELECT value FROM jsonb_array_elements(coalesce(_payload->'tables'->'progress_updates','[]')) LOOP
  INSERT INTO public.indicadores_checkins(id,metric_id,value,confidence,comment,recorded_by,recorded_at,source_metadata) VALUES((r->>'id')::uuid,(r->>'key_result_id')::uuid,(r->>'value')::numeric,NULL,coalesce(r->>'note',''),NULL,(r->>'recorded_at')::date::timestamptz,r||jsonb_build_object('origin','okr_tracker')) ON CONFLICT DO NOTHING;
 END LOOP;
 PERFORM set_config('request.jwt.claim.sub',actor::text,true);
 RETURN jsonb_build_object('processed',n);
END $$;
REVOKE ALL ON FUNCTION public.indicadores_import_okr(jsonb) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.indicadores_import_okr(jsonb) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.indicadores_guard_metric() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF TG_OP='INSERT' THEN NEW.created_by:=auth.uid(); ELSE NEW.created_by:=OLD.created_by; NEW.created_at:=OLD.created_at; END IF; IF trim(NEW.title)='' OR (NEW.initial_value=NEW.target_value AND NOT (TG_OP='INSERT' AND NEW.source_metadata->>'origin'='okr_tracker' AND EXISTS(SELECT 1 FROM public.indicadores_import_records r WHERE r.source_table='key_results' AND r.source_id=NEW.id AND (r.data->>'target')::numeric=NEW.target_value))) THEN RAISE EXCEPTION 'Informe um nome e uma meta diferente do valor inicial.'; END IF; IF NEW.responsible_id IS NULL AND NOT (NEW.source_metadata->>'origin'='okr_tracker' AND EXISTS(SELECT 1 FROM public.indicadores_import_records r WHERE r.source_table='key_results' AND r.source_id=NEW.id)) THEN RAISE EXCEPTION 'Informe o responsável.'; END IF; IF NEW.measure='binary' AND (NEW.initial_value<>0 OR NEW.target_value<>1 OR NEW.current_value NOT IN(0,1)) THEN RAISE EXCEPTION 'Marco usa Não feito (0) ou Feito (1).'; END IF; IF NEW.objective_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.indicadores_objectives o JOIN public.indicadores_cycles c ON c.id=o.cycle_id WHERE o.id=NEW.objective_id AND c.archived) THEN RAISE EXCEPTION 'O ciclo está arquivado.'; END IF; RETURN NEW; END $$;