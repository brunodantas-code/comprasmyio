CREATE TABLE public.request_subtypes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type_code text NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  form_kind text NOT NULL DEFAULT 'expense' CHECK (form_kind IN ('trip','rental','expense','category')),
  active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  is_system boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_type_code, code)
);
CREATE UNIQUE INDEX request_subtypes_name_uidx ON public.request_subtypes (request_type_code, lower(name));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.request_subtypes TO authenticated;
GRANT ALL ON public.request_subtypes TO service_role;
ALTER TABLE public.request_subtypes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_request_subtypes(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_erp_admin(_user_id) OR public.has_role(_user_id,'admin') OR public.has_role(_user_id,'financeiro')
$$;

CREATE POLICY "request_subtypes read" ON public.request_subtypes FOR SELECT TO authenticated USING (true);
CREATE POLICY "request_subtypes insert" ON public.request_subtypes FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_request_subtypes(auth.uid()) AND is_system = false);
CREATE POLICY "request_subtypes update" ON public.request_subtypes FOR UPDATE TO authenticated
  USING (public.can_manage_request_subtypes(auth.uid())) WITH CHECK (public.can_manage_request_subtypes(auth.uid()));
CREATE POLICY "request_subtypes delete" ON public.request_subtypes FOR DELETE TO authenticated
  USING (public.can_manage_request_subtypes(auth.uid()) AND is_system = false);

INSERT INTO public.request_subtypes (request_type_code, code, name, form_kind, position, is_system) VALUES
 ('viagens','passagens','Passagens','trip',1,true),
 ('viagens','hospedagens','Hospedagens','trip',2,true),
 ('viagens','aluguel_veiculos','Aluguel de Veículos','rental',3,true);

ALTER TABLE public.purchase_orders ADD COLUMN request_subtype text;