ALTER TABLE public.crm_proposta_pendencias ADD COLUMN valor_parcial_original text, ADD COLUMN linha_original jsonb;
CREATE TABLE public.crm_import_runs(id text PRIMARY KEY,requested_by uuid NOT NULL REFERENCES public.profiles(id),status text NOT NULL DEFAULT 'running' CHECK(status IN ('running','completed')),created_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz);
GRANT SELECT ON public.crm_import_runs TO authenticated; GRANT ALL ON public.crm_import_runs TO service_role; ALTER TABLE public.crm_import_runs ENABLE ROW LEVEL SECURITY; CREATE POLICY crm_import_runs_admin ON public.crm_import_runs FOR SELECT TO authenticated USING(public.is_erp_admin(auth.uid()));
CREATE TABLE public.crm_import_batches(run_id text NOT NULL REFERENCES public.crm_import_runs(id),batch_key text NOT NULL,table_name text NOT NULL,row_count integer NOT NULL,payload_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(run_id,batch_key));
GRANT SELECT ON public.crm_import_batches TO authenticated; GRANT ALL ON public.crm_import_batches TO service_role; ALTER TABLE public.crm_import_batches ENABLE ROW LEVEL SECURITY; CREATE POLICY crm_import_batches_admin ON public.crm_import_batches FOR SELECT TO authenticated USING(public.is_erp_admin(auth.uid()));
CREATE TABLE public.crm_import_originals(run_id text NOT NULL REFERENCES public.crm_import_runs(id),table_name text NOT NULL,record_key text NOT NULL,payload jsonb NOT NULL,PRIMARY KEY(run_id,table_name,record_key));
GRANT SELECT ON public.crm_import_originals TO authenticated; GRANT ALL ON public.crm_import_originals TO service_role; ALTER TABLE public.crm_import_originals ENABLE ROW LEVEL SECURITY; CREATE POLICY crm_import_originals_admin ON public.crm_import_originals FOR SELECT TO authenticated USING(public.is_erp_admin(auth.uid()));
CREATE OR REPLACE FUNCTION public.crm_history_import_active() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT current_setting('app.crm_history_import',true)='20261117' AND auth.uid()='6ca0eff8-7393-47bc-9054-9001138bcbc2'::uuid AND public.is_erp_admin(auth.uid()) AND private.has_app_access(auth.uid(),'crm') AND EXISTS(SELECT 1 FROM public.crm_import_runs WHERE id='20261117' AND status='running' AND requested_by=auth.uid()) $$;
REVOKE ALL ON FUNCTION public.crm_history_import_active() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.crm_history_import_active() TO authenticated,service_role;
DO $$ DECLARE t record; d text; BEGIN FOR t IN SELECT tg.oid,c.relname,tg.tgname,pg_get_triggerdef(tg.oid) AS definition FROM pg_trigger tg JOIN pg_class c ON c.oid=tg.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname LIKE 'crm_%' AND NOT tg.tgisinternal LOOP d:=replace(t.definition,' FOR EACH ROW ',' FOR EACH ROW WHEN (NOT public.crm_history_import_active()) '); EXECUTE format('DROP TRIGGER %I ON public.%I',t.tgname,t.relname); EXECUTE d; END LOOP; END $$;
CREATE OR REPLACE FUNCTION public.crm_import_history_batch(_table text,_batch_key text,_rows jsonb,_originals jsonb DEFAULT '[]'::jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb; cols text; sets text; pk text; hash text; old_hash text; n integer:=0; k text; allowed text[]:=ARRAY['crm_perfis_legado','crm_insumos','crm_produtos_myio','crm_produtos_myio_preco','crm_servicos_instalacao','crm_insumos_compatibilidade','crm_kits_insumos','crm_listas_preco','crm_parametros_preco','crm_precos_ponto','crm_precos_ponto_historico','crm_nomes_proposta','crm_regras_geracao','crm_regras_composicao','crm_regras_medicao','crm_itens_proposta_composicao','crm_itens_proposta_custo','crm_propostas_custo','crm_propostas_rateio','crm_levantamentos','crm_sugestoes_regra_medicao','crm_documentos_migrados','crm_atividades','crm_contatos','crm_custo_base_produto','crm_empresas','crm_etapas_lead','crm_fases_funil','crm_kits','crm_lead_contatos','crm_lead_origens','crm_leads','crm_lotes_custo','crm_municipios','crm_oportunidades','crm_papeis_contato','crm_parametros_motor','crm_proposta_itens','crm_proposta_memoria','crm_proposta_pendencias','crm_propostas','crm_tabela_precos','crm_tabela_precos_custo','crm_templates_mensagem','crm_templates_proposta'];
BEGIN
 IF auth.uid() IS DISTINCT FROM '6ca0eff8-7393-47bc-9054-9001138bcbc2'::uuid OR NOT public.is_erp_admin(auth.uid()) OR NOT private.has_app_access(auth.uid(),'crm') THEN RAISE EXCEPTION 'Importação não autorizada'; END IF;
 IF NOT _table=ANY(allowed) OR jsonb_typeof(_rows)<>'array' OR jsonb_array_length(_rows)>500 OR length(_batch_key)>180 OR _batch_key='' OR jsonb_typeof(_originals)<>'array' THEN RAISE EXCEPTION 'Lote inválido'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('crm-history-20261117'));
 INSERT INTO public.crm_import_runs(id,requested_by) VALUES('20261117',auth.uid()) ON CONFLICT(id) DO NOTHING;
 IF NOT EXISTS(SELECT 1 FROM public.crm_import_runs WHERE id='20261117' AND status='running' AND requested_by=auth.uid()) THEN RAISE EXCEPTION 'Importação encerrada'; END IF;
 hash:=md5(_rows::text||_originals::text); SELECT payload_hash INTO old_hash FROM public.crm_import_batches WHERE run_id='20261117' AND batch_key=_batch_key;
 IF old_hash IS NOT NULL THEN IF old_hash<>hash THEN RAISE EXCEPTION 'Lote já recebido com conteúdo diferente'; END IF; RETURN jsonb_build_object('rows',jsonb_array_length(_rows),'repeated',true); END IF;
 PERFORM set_config('app.crm_history_import','20261117',true);
 SELECT string_agg(quote_ident(a.attname),',' ORDER BY u.ord) INTO pk FROM pg_index i CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY u(num,ord) JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=u.num WHERE i.indrelid=format('public.%I',_table)::regclass AND i.indisprimary;
 FOR r IN SELECT value FROM jsonb_array_elements(_rows) LOOP
  IF jsonb_typeof(r)<>'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(r) v(key) WHERE NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=format('public.%I',_table)::regclass AND attname=v.key AND attnum>0 AND NOT attisdropped AND attgenerated='')) THEN RAISE EXCEPTION 'Campos inválidos'; END IF;
  SELECT string_agg(quote_ident(key),',' ORDER BY key),string_agg(format('%I=EXCLUDED.%I',key,key),',' ORDER BY key) INTO cols,sets FROM jsonb_object_keys(r) key;
  IF _table IN ('crm_papeis_contato','crm_etapas_lead','crm_templates_proposta','crm_parametros_motor') THEN
   k:=CASE WHEN _table IN ('crm_papeis_contato','crm_etapas_lead','crm_templates_proposta') THEN 'codigo' ELSE 'id' END;
   IF EXISTS(SELECT 1 FROM public.crm_import_originals WHERE run_id='20261117' AND table_name='erp_seed:'||_table AND record_key=r->>k) THEN NULL; ELSE
    EXECUTE format('INSERT INTO public.crm_import_originals(run_id,table_name,record_key,payload) SELECT $1,$2,$3,to_jsonb(t) FROM public.%I t WHERE to_jsonb(t)->>$4=$3 ON CONFLICT DO NOTHING',_table) USING '20261117','erp_seed:'||_table,r->>k,k;
   END IF;
   IF _table IN ('crm_etapas_lead','crm_templates_proposta') THEN
    EXECUTE format('UPDATE public.%I t SET %s FROM jsonb_populate_record(NULL::public.%I,$1) x WHERE t.%I=x.%I',_table,(SELECT string_agg(format('%I=x.%I',key,key),',') FROM jsonb_object_keys(r) key WHERE key<>'id'),_table,k,k) USING r;
    IF FOUND THEN n:=n+1;CONTINUE; END IF;
   END IF;
   EXECUTE format('INSERT INTO public.%I(%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) ON CONFLICT(%s) DO UPDATE SET %s',_table,cols,cols,_table,pk,sets) USING r;
  ELSE
   EXECUTE format('INSERT INTO public.%I(%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) ON CONFLICT(%s) DO NOTHING',_table,cols,cols,_table,pk) USING r;
   IF NOT FOUND THEN RAISE EXCEPTION 'Registro existente não pode ser sobrescrito: %',_table; END IF;
  END IF;
  n:=n+1;
 END LOOP;
 FOR r IN SELECT value FROM jsonb_array_elements(_originals) LOOP
  IF NOT(r?'table' AND r?'key' AND r?'payload') THEN RAISE EXCEPTION 'Origem inválida'; END IF;
  INSERT INTO public.crm_import_originals(run_id,table_name,record_key,payload) VALUES('20261117',r->>'table',r->>'key',r->'payload') ON CONFLICT DO NOTHING;
 END LOOP;
 INSERT INTO public.crm_import_batches(run_id,batch_key,table_name,row_count,payload_hash) VALUES('20261117',_batch_key,_table,n,hash);
 RETURN jsonb_build_object('rows',n,'repeated',false);
END $$;
REVOKE ALL ON FUNCTION public.crm_import_history_batch(text,text,jsonb,jsonb) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.crm_import_history_batch(text,text,jsonb,jsonb) TO authenticated;