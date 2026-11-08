ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
INSERT INTO public.erp_apps (key, name) VALUES ('cde', 'CDE') ON CONFLICT (key) DO NOTHING;