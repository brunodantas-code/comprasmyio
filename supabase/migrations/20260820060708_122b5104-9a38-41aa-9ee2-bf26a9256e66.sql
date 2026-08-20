CREATE TABLE public.technician_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id uuid NOT NULL REFERENCES public.stock_movements(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  technician text NOT NULL,
  destination text NOT NULL CHECK (destination IN ('unidade','perdido','almoxarifado')),
  project_id uuid REFERENCES public.projects(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.technician_moves TO authenticated;
GRANT ALL ON public.technician_moves TO service_role;
ALTER TABLE public.technician_moves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "technician_moves_select" ON public.technician_moves FOR SELECT TO authenticated USING (true);
CREATE POLICY "technician_moves_insert" ON public.technician_moves FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "technician_moves_delete" ON public.technician_moves FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.unit_products ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id);