-- 1. Organograma e faixas por usuário
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tier2_limit numeric NOT NULL DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS tier3_limit numeric NOT NULL DEFAULT 250000;

-- 2. Regras extras configuráveis (validação técnica, suprimentos, financeiro)
CREATE TABLE IF NOT EXISTS public.approval_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  step_type text NOT NULL DEFAULT 'tecnica',
  category text,
  approver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_rules TO authenticated;
GRANT ALL ON public.approval_rules TO service_role;
ALTER TABLE public.approval_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approval_rules_select" ON public.approval_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "approval_rules_manage" ON public.approval_rules
  FOR ALL TO authenticated
  USING (public.can_manage_limits(auth.uid()))
  WITH CHECK (public.can_manage_limits(auth.uid()));

CREATE TRIGGER approval_rules_set_updated_at
  BEFORE UPDATE ON public.approval_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Etapas de aprovação por solicitação
CREATE TABLE IF NOT EXISTS public.approval_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  step_index integer NOT NULL,
  role_label text NOT NULL,
  approver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pendente',
  comment text,
  decided_at timestamptz,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, step_index)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_steps TO authenticated;
GRANT ALL ON public.approval_steps TO service_role;
ALTER TABLE public.approval_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approval_steps_select" ON public.approval_steps
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "approval_steps_manage" ON public.approval_steps
  FOR ALL TO authenticated
  USING (public.can_manage_limits(auth.uid()))
  WITH CHECK (public.can_manage_limits(auth.uid()));

-- 4. Montagem automática da cadeia de aprovação
CREATE OR REPLACE FUNCTION public.build_approval_chain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  IF idx = 0 AND NEW.approval_status = 'aguardando_aprovacao' THEN
    -- sem aprovadores definidos: permanece aguardando decisão de um admin/C-level
    NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_build_approval_chain ON public.purchase_orders;
CREATE TRIGGER trg_build_approval_chain
  AFTER INSERT ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.build_approval_chain();

-- 5. Decisão de etapa
CREATE OR REPLACE FUNCTION public.decide_approval_step(_step_id uuid, _decision text, _comment text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  s RECORD;
  pending_count integer;
BEGIN
  SELECT * INTO s FROM public.approval_steps WHERE id = _step_id;
  IF s IS NULL THEN RAISE EXCEPTION 'Etapa não encontrada'; END IF;
  IF s.status <> 'pendente' THEN RAISE EXCEPTION 'Etapa já decidida'; END IF;
  IF _decision NOT IN ('aprovado','rejeitado') THEN RAISE EXCEPTION 'Decisão inválida'; END IF;

  IF NOT (s.approver_id = auth.uid() OR public.can_manage_limits(auth.uid())) THEN
    RAISE EXCEPTION 'Sem permissão para decidir esta etapa';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.approval_steps
    WHERE order_id = s.order_id AND status = 'pendente' AND step_index < s.step_index
  ) THEN
    RAISE EXCEPTION 'Existe etapa anterior pendente';
  END IF;

  UPDATE public.approval_steps
     SET status = _decision, comment = _comment, decided_at = now(), decided_by = auth.uid()
   WHERE id = _step_id;

  INSERT INTO public.order_logs (order_id, actor_id, action, details)
  VALUES (s.order_id, auth.uid(), _decision,
          jsonb_build_object('etapa', s.role_label, 'comentario', _comment));

  IF _decision = 'rejeitado' THEN
    UPDATE public.purchase_orders SET approval_status = 'rejeitado' WHERE id = s.order_id;
  ELSE
    SELECT count(*) INTO pending_count FROM public.approval_steps
      WHERE order_id = s.order_id AND status = 'pendente';
    IF pending_count = 0 THEN
      UPDATE public.purchase_orders
         SET approval_status = 'aprovado', approved_by = auth.uid(), approved_at = now()
       WHERE id = s.order_id;
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.decide_approval_step(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.decide_approval_step(uuid, text, text) TO authenticated;