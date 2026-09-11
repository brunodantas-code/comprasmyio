CREATE UNIQUE INDEX job_titles_name_normalized_unique
  ON public.job_titles (lower(btrim(name)));

CREATE UNIQUE INDEX cost_centers_name_normalized_unique
  ON public.cost_centers (lower(btrim(name)));

CREATE UNIQUE INDEX clients_name_normalized_unique
  ON public.clients (lower(btrim(name)));

CREATE UNIQUE INDEX projects_name_normalized_unique
  ON public.projects (lower(btrim(name)));