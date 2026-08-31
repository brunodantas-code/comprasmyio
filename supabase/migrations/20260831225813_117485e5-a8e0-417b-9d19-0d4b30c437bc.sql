CREATE TABLE public.approval_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  dual_approval_enabled boolean NOT NULL DEFAULT true,
  dual_approval_threshold numeric NOT NULL DEFAULT 100000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.approval_settings TO authenticated;
GRANT INSERT, UPDATE ON public.approval_settings TO authenticated;
GRANT ALL ON public.approval_settings TO service_role;

ALTER TABLE public.approval_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approval_settings_select" ON public.approval_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "approval_settings_manage" ON public.approval_settings
  FOR ALL TO authenticated
  USING (public.can_manage_limits(auth.uid()))
  WITH CHECK (public.can_manage_limits(auth.uid()));

CREATE TRIGGER approval_settings_set_updated_at
  BEFORE UPDATE ON public.approval_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.approval_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- etapas paralelas: mesmo step_index para aprovações conjuntas
ALTER TABLE public.approval_steps DROP CONSTRAINT IF EXISTS approval_steps_order_id_step_index_key;
CREATE INDEX IF NOT EXISTS approval_steps_order_step_idx ON public.approval_steps (order_id, step_index);

CREATE OR REPLACE FUNCTION public.build_approval_chain()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p RECORD;
  v numeric := COALESCE(NEW.estimated_value, 0);
  levels integer := 0;
  labels text[] := ARRAY['Gestor Direto','Gerente da Área','Diretor do Departamento','C-Level'];
  cur uuid;
  nxt uuid;
  i integer;
  idx integer := 0;
  r RECORD;
  cfg RECORD;
  dual_idx integer;
  u RECORD;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = NEW.requester_id;
  IF p IS NULL THEN RETURN NEW; END IF;

  IF v <= COALESCE(p.approval_limit, 0) THEN
    levels := 0;
  ELSIF v <= COALESCE(p.tier2_limit, 50000) THEN
    levels := 2;
  ELSIF v <= COALESCE(p.tier3_limit, 250000) THEN
    levels := 3;
  ELSE
    levels := 4;
  END IF;

  cur := NEW.requester_id;
  i := 1;
  WHILE i <= levels LOOP
    SELECT manager_id INTO nxt FROM public.profiles WHERE id = cur;
    EXIT WHEN nxt IS NULL;
    idx := idx + 1;
    INSERT INTO public.approval_steps (order_id, step_index, role_label, approver_id)
    VALUES (NEW.id, idx, labels[i], nxt);
    cur := nxt;
    i := i + 1;
  END LOOP;

  FOR r IN SELECT * FROM public.approval_rules WHERE active ORDER BY position, created_at LOOP
    idx := idx + 1;
    INSERT INTO public.approval_steps (order_id, step_index, role_label, approver_id)
    VALUES (NEW.id, idx, r.name, r.approver_id);
  END LOOP;

  SELECT * INTO cfg FROM public.approval_settings WHERE id;
  IF cfg IS NOT NULL AND cfg.dual_approval_enabled AND v > COALESCE(cfg.dual_approval_threshold, 100000) THEN
    dual_idx := idx + 1;
    FOR u IN
      SELECT DISTINCT ON (ur.role) ur.role, ur.user_id
      FROM public.user_roles ur
      WHERE ur.role IN ('cfo','ceo')
      ORDER BY ur.role, ur.created_at
    LOOP
      INSERT INTO public.approval_steps (order_id, step_index, role_label, approver_id)
      VALUES (NEW.id, dual_idx, CASE WHEN u.role = 'cfo' THEN 'Dupla aprovação — CFO' ELSE 'Dupla aprovação — CEO' END, u.user_id);
      idx := dual_idx;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;
