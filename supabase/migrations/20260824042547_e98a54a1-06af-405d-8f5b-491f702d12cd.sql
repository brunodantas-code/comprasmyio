CREATE TABLE public.external_product_states (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  product_type text,
  location text NOT NULL DEFAULT 'estoque',
  status text,
  technician text,
  qr_value text,
  material_id uuid REFERENCES public.materials(id),
  homologation_unit_id uuid REFERENCES public.homologation_units(id),
  last_change_at timestamp with time zone NOT NULL DEFAULT now(),
  payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.external_product_states TO authenticated;
GRANT ALL ON public.external_product_states TO service_role;
ALTER TABLE public.external_product_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários autenticados leem estados externos" ON public.external_product_states FOR SELECT TO authenticated USING (true);
CREATE TRIGGER external_product_states_set_updated_at BEFORE UPDATE ON public.external_product_states FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE public.external_sync_state (
  id boolean NOT NULL DEFAULT true PRIMARY KEY CHECK (id),
  lease_until timestamp with time zone,
  last_run_at timestamp with time zone,
  last_status text,
  last_message text,
  total_items integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
INSERT INTO public.external_sync_state (id) VALUES (true);
GRANT SELECT ON public.external_sync_state TO authenticated;
GRANT ALL ON public.external_sync_state TO service_role;
ALTER TABLE public.external_sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários autenticados leem estado da sincronização" ON public.external_sync_state FOR SELECT TO authenticated USING (true);
CREATE TRIGGER external_sync_state_set_updated_at BEFORE UPDATE ON public.external_sync_state FOR EACH ROW EXECUTE FUNCTION set_updated_at();