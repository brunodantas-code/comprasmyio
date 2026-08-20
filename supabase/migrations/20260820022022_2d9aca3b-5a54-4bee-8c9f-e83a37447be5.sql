CREATE TABLE public.production_demands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid UNIQUE,
  order_id uuid REFERENCES public.myio_orders(id) ON DELETE CASCADE,
  product text NOT NULL,
  quantity integer NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_demands TO authenticated;
GRANT ALL ON public.production_demands TO service_role;
ALTER TABLE public.production_demands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read production_demands" ON public.production_demands FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert production_demands" ON public.production_demands FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update production_demands" ON public.production_demands FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete production_demands" ON public.production_demands FOR DELETE TO authenticated USING (true);

CREATE TABLE public.purchase_demands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid UNIQUE,
  order_id uuid REFERENCES public.myio_orders(id) ON DELETE CASCADE,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  product text NOT NULL,
  quantity integer NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_demands TO authenticated;
GRANT ALL ON public.purchase_demands TO service_role;
ALTER TABLE public.purchase_demands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read purchase_demands" ON public.purchase_demands FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert purchase_demands" ON public.purchase_demands FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update purchase_demands" ON public.purchase_demands FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete purchase_demands" ON public.purchase_demands FOR DELETE TO authenticated USING (true);