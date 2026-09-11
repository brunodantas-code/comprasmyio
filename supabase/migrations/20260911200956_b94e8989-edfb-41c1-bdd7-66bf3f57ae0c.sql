ALTER TABLE public.job_titles
  ADD COLUMN short_name text;

ALTER TABLE public.job_titles
  ADD CONSTRAINT job_titles_short_name_length
  CHECK (short_name IS NULL OR char_length(btrim(short_name)) BETWEEN 2 AND 30);