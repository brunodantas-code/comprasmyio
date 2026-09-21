CREATE TABLE public.client_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_categories TO authenticated;
GRANT ALL ON public.client_categories TO service_role;

ALTER TABLE public.client_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_categories_select_authenticated
ON public.client_categories
FOR SELECT
TO authenticated
USING (active OR public.is_access_admin(auth.uid()));

CREATE POLICY client_categories_admin_insert
ON public.client_categories
FOR INSERT
TO authenticated
WITH CHECK (public.is_access_admin(auth.uid()));

CREATE POLICY client_categories_admin_update
ON public.client_categories
FOR UPDATE
TO authenticated
USING (public.is_access_admin(auth.uid()))
WITH CHECK (public.is_access_admin(auth.uid()));

CREATE POLICY client_categories_admin_delete
ON public.client_categories
FOR DELETE
TO authenticated
USING (public.is_access_admin(auth.uid()));

CREATE UNIQUE INDEX client_categories_name_unique_ci
ON public.client_categories (lower(btrim(name)));

INSERT INTO public.client_categories (name, position)
VALUES ('Shoppings', 1), ('Lojas', 2);

ALTER TABLE public.clients
  ADD COLUMN category_id uuid NULL REFERENCES public.client_categories(id) ON DELETE RESTRICT;

ALTER TABLE public.client_units
  ADD COLUMN category_id uuid NULL REFERENCES public.client_categories(id) ON DELETE RESTRICT;

CREATE INDEX clients_category_id_idx ON public.clients(category_id);
CREATE INDEX client_units_category_id_idx ON public.client_units(category_id);

UPDATE public.clients
SET category_id = (SELECT id FROM public.client_categories WHERE name = 'Shoppings')
WHERE lower(coalesce(name, '') || ' ' || coalesce(legal_name, '')) LIKE '%shopping%';

UPDATE public.clients
SET category_id = (SELECT id FROM public.client_categories WHERE name = 'Lojas')
WHERE lower(coalesce(name, '') || ' ' || coalesce(legal_name, '')) LIKE '%obramax%';

UPDATE public.client_units
SET category_id = (SELECT id FROM public.client_categories WHERE name = 'Shoppings')
WHERE lower(name) LIKE '%shopping%';

UPDATE public.client_units
SET category_id = (SELECT id FROM public.client_categories WHERE name = 'Lojas')
WHERE lower(name) LIKE '%obramax%';