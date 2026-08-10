ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS client_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_cnpj text;