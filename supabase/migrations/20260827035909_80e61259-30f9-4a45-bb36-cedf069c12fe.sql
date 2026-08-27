CREATE TABLE public.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  notes text,
  status public.order_status NOT NULL DEFAULT 'pendente',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_batches TO authenticated;
GRANT ALL ON public.import_batches TO service_role;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_batches_select" ON public.import_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "import_batches_insert" ON public.import_batches FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "import_batches_update" ON public.import_batches FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'comprador'));
CREATE POLICY "import_batches_delete" ON public.import_batches FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER import_batches_set_updated_at BEFORE UPDATE ON public.import_batches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.import_batch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('fabrica','terceiros','ferramenta')),
  material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  terceiros_material_id uuid REFERENCES public.terceiros_materials(id) ON DELETE SET NULL,
  tool_asset_id uuid REFERENCES public.tool_assets(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_batch_items TO authenticated;
GRANT ALL ON public.import_batch_items TO service_role;
ALTER TABLE public.import_batch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_batch_items_select" ON public.import_batch_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "import_batch_items_write" ON public.import_batch_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.import_batches b WHERE b.id = batch_id AND (b.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.import_batches b WHERE b.id = batch_id AND (b.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

CREATE INDEX idx_import_batch_items_batch ON public.import_batch_items(batch_id);

CREATE OR REPLACE FUNCTION public.import_stock_entry_on_receipt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  it RECORD;
BEGIN
  IF NEW.status = 'recebido_ok'::order_status AND OLD.status IS DISTINCT FROM NEW.status THEN
    FOR it IN SELECT * FROM public.import_batch_items WHERE batch_id = NEW.id LOOP
      IF it.material_id IS NOT NULL THEN
        INSERT INTO public.stock_movements (material_id, quantity, type, reason, created_by)
        VALUES (it.material_id, GREATEST(it.quantity, 1), 'entrada', 'Recebimento da importação: ' || NEW.name, auth.uid());
      ELSIF it.terceiros_material_id IS NOT NULL THEN
        INSERT INTO public.terceiros_movements (material_id, quantity, type, reason, created_by)
        VALUES (it.terceiros_material_id, GREATEST(it.quantity, 1), 'entrada', 'Recebimento da importação: ' || NEW.name, auth.uid());
      ELSIF it.tool_asset_id IS NOT NULL THEN
        INSERT INTO public.tool_movements (material_id, quantity, type, reason, created_by)
        VALUES (it.tool_asset_id, GREATEST(it.quantity, 1), 'entrada', 'Recebimento da importação: ' || NEW.name, auth.uid());
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.import_stock_entry_on_receipt() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_import_stock_entry_on_receipt AFTER UPDATE ON public.import_batches FOR EACH ROW EXECUTE FUNCTION public.import_stock_entry_on_receipt();