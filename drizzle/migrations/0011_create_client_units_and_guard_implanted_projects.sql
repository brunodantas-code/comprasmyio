CREATE TABLE public.client_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cnpj TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT client_units_name_not_blank CHECK (length(btrim(name)) >= 2),
  CONSTRAINT client_units_client_name_unique UNIQUE (client_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_units TO authenticated;
GRANT ALL ON public.client_units TO service_role;

ALTER TABLE public.client_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_units_select_auth
ON public.client_units
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY client_units_admin_all
ON public.client_units
FOR ALL
TO authenticated
USING (public.is_access_admin(auth.uid()))
WITH CHECK (public.is_access_admin(auth.uid()));

CREATE TRIGGER set_client_units_updated_at
BEFORE UPDATE ON public.client_units
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.purchase_orders
ADD COLUMN client_unit_id UUID REFERENCES public.client_units(id) ON DELETE RESTRICT;

CREATE INDEX purchase_orders_client_unit_id_idx
ON public.purchase_orders(client_unit_id);

CREATE OR REPLACE FUNCTION public.validate_purchase_order_active_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_status TEXT;
BEGIN
  IF NEW.project_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT status INTO project_status
  FROM public.projects
  WHERE id = NEW.project_id;

  IF project_status IS NULL THEN
    RAISE EXCEPTION 'Projeto não encontrado.' USING ERRCODE = '23503';
  END IF;

  IF project_status <> 'active' THEN
    RAISE EXCEPTION 'Projetos implantados ou cancelados não podem receber novos custos.' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_purchase_order_active_project_on_insert
BEFORE INSERT ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.validate_purchase_order_active_project();

CREATE TRIGGER validate_purchase_order_active_project_on_reallocation
BEFORE UPDATE OF project_id ON public.purchase_orders
FOR EACH ROW
WHEN (NEW.project_id IS DISTINCT FROM OLD.project_id)
EXECUTE FUNCTION public.validate_purchase_order_active_project();