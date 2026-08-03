CREATE TYPE public.myio_order_status AS ENUM ('pendente','produzindo','pronto_entrega','entregue_cliente');

CREATE TABLE public.myio_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  client_name text NOT NULL DEFAULT '',
  delivery_date date NOT NULL,
  status public.myio_order_status NOT NULL DEFAULT 'pendente',
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.myio_orders TO authenticated;
GRANT ALL ON public.myio_orders TO service_role;
ALTER TABLE public.myio_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myio_orders_admin_all" ON public.myio_orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.myio_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.myio_orders(id) ON DELETE CASCADE,
  product text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.myio_order_items TO authenticated;
GRANT ALL ON public.myio_order_items TO service_role;
ALTER TABLE public.myio_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "myio_order_items_admin_all" ON public.myio_order_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_myio_order_items_order_id ON public.myio_order_items(order_id);

CREATE TRIGGER myio_orders_set_updated_at BEFORE UPDATE ON public.myio_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();