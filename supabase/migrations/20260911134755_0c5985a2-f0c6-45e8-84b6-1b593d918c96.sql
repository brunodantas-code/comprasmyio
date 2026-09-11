INSERT INTO public.job_titles (name, description)
VALUES
  ('CEO', 'Chief Executive Officer'),
  ('CFO', 'Chief Financial Officer'),
  ('CTO', 'Chief Technology Officer'),
  ('COO', 'Chief Operating Officer')
ON CONFLICT (name) DO UPDATE
SET active = true,
    description = COALESCE(public.job_titles.description, EXCLUDED.description),
    updated_at = now();