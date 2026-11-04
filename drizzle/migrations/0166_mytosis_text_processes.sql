CREATE TABLE public.mytosis_processes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL,
 sections jsonb NOT NULL DEFAULT '[]'::jsonb,
 flow_ids uuid[] NOT NULL DEFAULT '{}',
 stage_bindings jsonb NOT NULL DEFAULT '[]'::jsonb,
 revision integer NOT NULL DEFAULT 1,
 created_by uuid NOT NULL DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mytosis_processes TO authenticated;
GRANT ALL ON public.mytosis_processes TO service_role;
ALTER TABLE public.mytosis_processes ENABLE ROW LEVEL SECURITY;
CREATE POLICY mytosis_processes_read ON public.mytosis_processes FOR SELECT TO authenticated USING (public.mytosis_role(auth.uid()) IS NOT NULL);
CREATE POLICY mytosis_processes_create ON public.mytosis_processes FOR INSERT TO authenticated WITH CHECK (public.mytosis_can_edit(auth.uid()) AND created_by = auth.uid());
CREATE POLICY mytosis_processes_update ON public.mytosis_processes FOR UPDATE TO authenticated USING (public.mytosis_can_edit(auth.uid())) WITH CHECK (public.mytosis_can_edit(auth.uid()));
CREATE POLICY mytosis_processes_delete ON public.mytosis_processes FOR DELETE TO authenticated USING (public.mytosis_can_edit(auth.uid()));
CREATE FUNCTION public.guard_mytosis_text_process() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE entry jsonb; section jsonb; paragraph jsonb; flow_id uuid;
BEGIN
 IF length(trim(NEW.name)) = 0 THEN RAISE EXCEPTION 'Informe o nome do Processo.'; END IF;
 IF jsonb_typeof(NEW.sections) <> 'array' OR jsonb_typeof(NEW.stage_bindings) <> 'array' THEN RAISE EXCEPTION 'Conteúdo inválido.'; END IF;
 IF TG_OP = 'UPDATE' THEN NEW.created_by := OLD.created_by; NEW.created_at := OLD.created_at; NEW.revision := OLD.revision + 1; END IF;
 NEW.updated_at := now();
 FOREACH flow_id IN ARRAY NEW.flow_ids LOOP
  IF NOT EXISTS (SELECT 1 FROM public.mytosis_nodes WHERE id = flow_id AND is_process AND parent_id IS NULL) THEN RAISE EXCEPTION 'Fluxograma não disponível.'; END IF;
 END LOOP;
 FOR section IN SELECT value FROM jsonb_array_elements(NEW.sections) LOOP
  IF length(trim(section->>'title')) IS NULL OR length(trim(section->>'title')) = 0 OR jsonb_typeof(section->'paragraphs') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Informe o título da seção.'; END IF;
  FOR paragraph IN SELECT value FROM jsonb_array_elements(section->'paragraphs') LOOP
   IF length(trim(paragraph->>'text')) IS NULL OR length(trim(paragraph->>'text')) = 0 THEN RAISE EXCEPTION 'Preencha o parágrafo ou remova-o.'; END IF;
  END LOOP;
 END LOOP;
 FOR entry IN SELECT value FROM jsonb_array_elements(NEW.stage_bindings) LOOP
  IF NOT EXISTS (WITH RECURSIVE scope AS (SELECT id FROM public.mytosis_nodes WHERE id = ANY(NEW.flow_ids) UNION ALL SELECT n.id FROM public.mytosis_nodes n JOIN scope s ON n.parent_id = s.id) SELECT 1 FROM scope WHERE id = (entry->>'node_id')::uuid) THEN RAISE EXCEPTION 'Etapa fora dos fluxogramas vinculados.'; END IF;
  IF nullif(entry->>'responsible_id','') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.mytosis_users() WHERE id = (entry->>'responsible_id')::uuid) THEN RAISE EXCEPTION 'Responsável não disponível.'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_mytosis_text_process BEFORE INSERT OR UPDATE ON public.mytosis_processes FOR EACH ROW EXECUTE FUNCTION public.guard_mytosis_text_process();