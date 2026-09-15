CREATE TABLE public.stock_destinations (
  code text PRIMARY KEY,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_destinations_code_not_blank CHECK (btrim(code) <> ''),
  CONSTRAINT stock_destinations_name_not_blank CHECK (btrim(name) <> '')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_destinations TO authenticated;
GRANT ALL ON public.stock_destinations TO service_role;

ALTER TABLE public.stock_destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_destinations_select"
ON public.stock_destinations
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "stock_destinations_manage"
ON public.stock_destinations
FOR ALL
TO authenticated
USING (public.can_manage_limits(auth.uid()))
WITH CHECK (public.can_manage_limits(auth.uid()));

CREATE UNIQUE INDEX stock_destinations_name_unique
ON public.stock_destinations (lower(btrim(name)));

CREATE TRIGGER stock_destinations_set_updated_at
BEFORE UPDATE ON public.stock_destinations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.stock_destinations (code, name, position, active) VALUES
  ('myio', 'myio', 1, true),
  ('cliente', 'Cliente', 2, true),
  ('tecnico', 'Técnicos', 3, true),
  ('perdido', 'Perdido', 4, true),
  ('avariado', 'Avariado', 5, true);