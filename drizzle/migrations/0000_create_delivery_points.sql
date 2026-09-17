CREATE TABLE public.delivery_points (
  code text PRIMARY KEY,
  name text NOT NULL,
  address text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT delivery_points_code_not_blank CHECK (btrim(code) <> ''),
  CONSTRAINT delivery_points_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT delivery_points_name_length CHECK (char_length(btrim(name)) BETWEEN 2 AND 100),
  CONSTRAINT delivery_points_address_not_blank CHECK (char_length(btrim(address)) >= 3),
  CONSTRAINT delivery_points_position_nonnegative CHECK (position >= 0)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_points TO authenticated;
GRANT ALL ON public.delivery_points TO service_role;

ALTER TABLE public.delivery_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_points_select"
ON public.delivery_points
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "delivery_points_manage"
ON public.delivery_points
FOR ALL
TO authenticated
USING (public.can_manage_limits(auth.uid()))
WITH CHECK (public.can_manage_limits(auth.uid()));

CREATE UNIQUE INDEX delivery_points_name_unique
ON public.delivery_points (lower(btrim(name)));

CREATE TRIGGER delivery_points_set_updated_at
BEFORE UPDATE ON public.delivery_points
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();