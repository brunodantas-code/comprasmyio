ALTER TABLE public.pm_tasks ADD COLUMN parent_id uuid REFERENCES public.pm_tasks(id), ADD COLUMN work_package boolean NOT NULL DEFAULT false;
ALTER TABLE public.pm_dependencies ADD COLUMN link_type text NOT NULL DEFAULT 'TI';
ALTER TABLE public.pm_dependencies ADD CONSTRAINT pm_dependency_link_type CHECK(link_type IN ('TI','II','TT','IT'));
CREATE FUNCTION public.pm_task_hierarchy_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.project_id::text,0));
 IF NEW.parent_id IS NOT NULL THEN
 IF NOT EXISTS(SELECT 1 FROM public.pm_tasks WHERE id=NEW.parent_id AND project_id=NEW.project_id AND phase_id IS NOT DISTINCT FROM NEW.phase_id) THEN RAISE EXCEPTION 'A tarefa superior deve pertencer ao mesmo projeto e fase'; END IF;
 IF NEW.parent_id=NEW.id OR EXISTS(WITH RECURSIVE ancestors(id,parent_id) AS (SELECT id,parent_id FROM public.pm_tasks WHERE id=NEW.parent_id UNION SELECT t.id,t.parent_id FROM public.pm_tasks t JOIN ancestors a ON t.id=a.parent_id) SELECT 1 FROM ancestors WHERE id=NEW.id) THEN RAISE EXCEPTION 'Hierarquia circular'; END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM public.pm_tasks WHERE parent_id=NEW.id AND phase_id IS DISTINCT FROM NEW.phase_id) THEN RAISE EXCEPTION 'Mova primeiro as subtarefas para a mesma fase'; END IF;
 RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.pm_task_hierarchy_guard() FROM PUBLIC,anon;
CREATE TRIGGER pm_task_hierarchy BEFORE INSERT OR UPDATE ON public.pm_tasks FOR EACH ROW EXECUTE FUNCTION public.pm_task_hierarchy_guard();