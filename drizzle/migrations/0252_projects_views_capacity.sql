ALTER TABLE public.pm_projects ADD COLUMN board_columns jsonb NOT NULL DEFAULT '[{"id":"todo","name":"A fazer","progress":0},{"id":"doing","name":"Em andamento","progress":50},{"id":"done","name":"Concluído","progress":100}]', ADD COLUMN custom_fields jsonb NOT NULL DEFAULT '[]';
ALTER TABLE public.pm_tasks ADD COLUMN board_column text, ADD COLUMN custom_values jsonb NOT NULL DEFAULT '{}';
CREATE FUNCTION public.pm_view_config_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ DECLARE item jsonb; BEGIN
 IF TG_OP='UPDATE' AND (NEW.board_columns IS DISTINCT FROM OLD.board_columns OR NEW.custom_fields IS DISTINCT FROM OLD.custom_fields) AND NOT public.pm_can_manage(NEW.id) THEN RAISE EXCEPTION 'Somente gestores configuram o quadro e os campos'; END IF;
 IF jsonb_typeof(NEW.board_columns)<>'array' OR jsonb_array_length(NEW.board_columns)<2 OR jsonb_array_length(NEW.board_columns)>20 OR jsonb_typeof(NEW.custom_fields)<>'array' THEN RAISE EXCEPTION 'Configuração inválida'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(NEW.board_columns) LOOP
 IF coalesce(item->>'id','')='' OR coalesce(trim(item->>'name'),'')='' OR (item->>'progress') IS NULL OR (item->>'progress')::numeric NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Informe nome e avanço entre 0 e 100 para cada coluna'; END IF;
 END LOOP;
 IF (SELECT count(*)<>count(DISTINCT value->>'id') FROM jsonb_array_elements(NEW.board_columns)) THEN RAISE EXCEPTION 'Colunas repetidas'; END IF;
 IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM public.pm_tasks t WHERE t.project_id=NEW.id AND t.board_column IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.board_columns) c WHERE c->>'id'=t.board_column)) THEN RAISE EXCEPTION 'Mova as atividades antes de remover a coluna'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(NEW.custom_fields) LOOP
 IF coalesce(item->>'id','')='' OR coalesce(trim(item->>'name'),'')='' OR coalesce(item->>'type','') NOT IN ('text','number','date') THEN RAISE EXCEPTION 'Campo personalizado inválido'; END IF;
 END LOOP;
 IF (SELECT count(*)<>count(DISTINCT value->>'id') FROM jsonb_array_elements(NEW.custom_fields)) THEN RAISE EXCEPTION 'Campos repetidos'; END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.pm_view_config_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER pm_view_config BEFORE INSERT OR UPDATE ON public.pm_projects FOR EACH ROW EXECUTE FUNCTION public.pm_view_config_guard();
CREATE FUNCTION public.pm_task_view_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ DECLARE cols jsonb; fields jsonb; item jsonb; val text; BEGIN
 SELECT board_columns,custom_fields INTO cols,fields FROM public.pm_projects WHERE id=NEW.project_id;
 IF NEW.board_column IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(cols) c WHERE c->>'id'=NEW.board_column) THEN RAISE EXCEPTION 'Coluna não pertence ao projeto'; END IF;
 IF TG_OP='UPDATE' AND NEW.progress IS DISTINCT FROM OLD.progress AND NEW.board_column IS NOT DISTINCT FROM OLD.board_column THEN NEW.board_column:=NULL; END IF;
 IF jsonb_typeof(NEW.custom_values)<>'object' THEN RAISE EXCEPTION 'Valores personalizados inválidos'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(fields) LOOP
 val:=NEW.custom_values->>(item->>'id');
 IF val IS NOT NULL AND val<>'' THEN
 IF item->>'type'='number' THEN PERFORM val::numeric; ELSIF item->>'type'='date' THEN PERFORM val::date; END IF;
 END IF;
 END LOOP;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.pm_task_view_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER pm_task_view BEFORE INSERT OR UPDATE ON public.pm_tasks FOR EACH ROW EXECUTE FUNCTION public.pm_task_view_guard();
CREATE FUNCTION public.pm_bulk_tasks(_project uuid,_changes jsonb) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$ DECLARE item jsonb; patch jsonb; n integer:=0; affected integer; BEGIN
 IF auth.uid() IS NULL OR NOT public.pm_can_edit(_project) THEN RAISE EXCEPTION 'Projeto não autorizado'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_project::text,0));
 PERFORM 1 FROM public.pm_projects WHERE id=_project AND status NOT IN ('concluido','cancelado') FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Projeto encerrado ou indisponível'; END IF;
 IF jsonb_typeof(_changes)<>'array' OR jsonb_array_length(_changes)=0 THEN RAISE EXCEPTION 'Selecione atividades'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(_changes) LOOP
 patch:=item->'values';
 IF jsonb_typeof(patch)<>'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(patch) k WHERE k NOT IN ('start_date','duration','responsible_id','progress','board_column','custom_values','actual_start','actual_end')) THEN RAISE EXCEPTION 'Alteração em lote inválida'; END IF;
 UPDATE public.pm_tasks SET start_date=CASE WHEN patch ? 'start_date' THEN (patch->>'start_date')::date ELSE start_date END, duration=CASE WHEN patch ? 'duration' THEN (patch->>'duration')::integer ELSE duration END, responsible_id=CASE WHEN patch ? 'responsible_id' THEN (patch->>'responsible_id')::uuid ELSE responsible_id END, progress=CASE WHEN patch ? 'progress' THEN (patch->>'progress')::numeric ELSE progress END, board_column=CASE WHEN patch ? 'board_column' THEN patch->>'board_column' ELSE board_column END, custom_values=CASE WHEN patch ? 'custom_values' THEN custom_values|| (patch->'custom_values') ELSE custom_values END, actual_start=CASE WHEN patch ? 'actual_start' THEN (patch->>'actual_start')::date ELSE actual_start END, actual_end=CASE WHEN patch ? 'actual_end' THEN (patch->>'actual_end')::date ELSE actual_end END WHERE id=(item->>'id')::uuid AND project_id=_project;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>1 THEN RAISE EXCEPTION 'Atividade não autorizada'; END IF; n:=n+1;
 END LOOP;
 RETURN n; END $$;
REVOKE ALL ON FUNCTION public.pm_bulk_tasks(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pm_bulk_tasks(uuid,jsonb) TO authenticated,service_role;