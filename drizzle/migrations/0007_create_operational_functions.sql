CREATE TABLE public.operational_functions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_functions TO authenticated;
GRANT ALL ON public.operational_functions TO service_role;

ALTER TABLE public.operational_functions ENABLE ROW LEVEL SECURITY;

CREATE POLICY operational_functions_select_authenticated
ON public.operational_functions
FOR SELECT
TO authenticated
USING (active OR public.is_access_admin(auth.uid()));

CREATE POLICY operational_functions_admin_insert
ON public.operational_functions
FOR INSERT
TO authenticated
WITH CHECK (public.is_access_admin(auth.uid()));

CREATE POLICY operational_functions_admin_update
ON public.operational_functions
FOR UPDATE
TO authenticated
USING (public.is_access_admin(auth.uid()))
WITH CHECK (public.is_access_admin(auth.uid()));

CREATE POLICY operational_functions_admin_delete
ON public.operational_functions
FOR DELETE
TO authenticated
USING (public.is_access_admin(auth.uid()));

CREATE UNIQUE INDEX operational_functions_name_unique_ci
ON public.operational_functions (lower(btrim(name)));

CREATE TABLE public.user_operational_functions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  operational_function_id uuid NOT NULL REFERENCES public.operational_functions(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id),
  UNIQUE (user_id, operational_function_id)
);

GRANT SELECT ON public.user_operational_functions TO authenticated;
GRANT ALL ON public.user_operational_functions TO service_role;

ALTER TABLE public.user_operational_functions ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_operational_functions_select_self_or_admin
ON public.user_operational_functions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_access_admin(auth.uid()));

INSERT INTO public.operational_functions (code, name, description, active)
VALUES ('supply', 'Time de Supply', 'Execução operacional das compras aprovadas e acompanhamento da Fila do Supply.', true);

INSERT INTO public.user_operational_functions (user_id, operational_function_id)
SELECT DISTINCT ur.user_id, operational_function.id
FROM public.user_roles ur
CROSS JOIN LATERAL (
  SELECT id FROM public.operational_functions WHERE code = 'supply' LIMIT 1
) operational_function
JOIN public.profiles profile ON profile.id = ur.user_id AND profile.deleted_at IS NULL
WHERE ur.role = 'comprador'
ON CONFLICT (user_id) DO UPDATE
SET operational_function_id = EXCLUDED.operational_function_id,
    updated_at = now();

CREATE OR REPLACE FUNCTION public.is_supply_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_operational_functions uof
      JOIN public.operational_functions operational_function
        ON operational_function.id = uof.operational_function_id
      WHERE uof.user_id = _user_id
        AND operational_function.code = 'supply'
        AND operational_function.active
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role = 'comprador'
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles profile
      JOIN public.job_titles job_title ON job_title.id = profile.job_title_id
      WHERE profile.id = _user_id
        AND profile.deleted_at IS NULL
        AND lower(job_title.name) LIKE '%supply%'
    );
$function$;

GRANT EXECUTE ON FUNCTION public.is_supply_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_supply_member(uuid) TO service_role;