ALTER TABLE public.projects
  ADD COLUMN client_unit_id UUID NULL REFERENCES public.client_units(id) ON DELETE RESTRICT;

CREATE INDEX projects_client_unit_id_idx
  ON public.projects(client_unit_id);

CREATE TRIGGER validate_project_client_unit
BEFORE INSERT OR UPDATE OF client_id, client_unit_id ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.validate_client_unit_assignment();