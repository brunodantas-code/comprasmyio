ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS responsible text,
  ADD COLUMN IF NOT EXISTS photo_url text;

CREATE TABLE IF NOT EXISTS public.stock_movement_qrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id uuid NOT NULL REFERENCES public.stock_movements(id) ON DELETE CASCADE,
  qr_value text NOT NULL,
  box_qr text,
  homologation_unit_id uuid REFERENCES public.homologation_units(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movement_qrs TO authenticated;
GRANT ALL ON public.stock_movement_qrs TO service_role;
ALTER TABLE public.stock_movement_qrs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read stock_movement_qrs" ON public.stock_movement_qrs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert stock_movement_qrs" ON public.stock_movement_qrs FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "auth delete stock_movement_qrs" ON public.stock_movement_qrs FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS stock_movement_qrs_movement_idx ON public.stock_movement_qrs(movement_id);
CREATE INDEX IF NOT EXISTS stock_movement_qrs_value_idx ON public.stock_movement_qrs(qr_value);