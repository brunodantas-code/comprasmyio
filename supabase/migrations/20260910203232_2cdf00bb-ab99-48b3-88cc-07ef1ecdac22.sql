ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS concluded_at date;

COMMENT ON COLUMN public.projects.status IS 'active | implantado | cancelado';
COMMENT ON COLUMN public.projects.concluded_at IS 'Data de implantação ou cancelamento';