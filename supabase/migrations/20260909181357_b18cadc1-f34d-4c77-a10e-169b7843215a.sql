CREATE TABLE public.cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_centers TO authenticated;
GRANT ALL ON public.cost_centers TO service_role;

ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cost_centers_select" ON public.cost_centers FOR SELECT TO authenticated USING (true);
CREATE POLICY "cost_centers_insert" ON public.cost_centers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cost_centers_update" ON public.cost_centers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cost_centers_delete" ON public.cost_centers FOR DELETE TO authenticated USING (true);

CREATE TRIGGER cost_centers_set_updated_at BEFORE UPDATE ON public.cost_centers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.purchase_orders ADD COLUMN cost_center_id uuid REFERENCES public.cost_centers(id);