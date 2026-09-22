CREATE OR REPLACE FUNCTION public.build_approval_chain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  p RECORD;
  v numeric := COALESCE(NEW.estimated_value, 0);
  qty integer := COALESCE(NEW.quantity, 0);
  max_levels integer := 0;
  hops integer := 0;
  idx integer := 0;
  r RECORD;
  cfg RECORD;
  dual_idx integer;
  dual_title RECORD;
  u RECORD;
  seen uuid[] := '{}';
  cfo_id uuid;
  ceo_id uuid;
  final_id uuid;
  final_lbl text;
  auto_ok boolean := false;
  cur_title uuid;
  nxt_title uuid;
  nxt_name text;
  seen_titles uuid[] := '{}';
  levels_used integer := 0;
  added_any boolean;
  requester_is_ceo boolean := false;
  requester_is_c_level boolean := false;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF EXISTS (SELECT 1 FROM public.approval_steps WHERE order_id = NEW.id AND status <> 'pendente') THEN RETURN NEW; END IF;
    DELETE FROM public.approval_steps WHERE order_id = NEW.id;
  END IF;

  SELECT * INTO p FROM public.profiles WHERE id = NEW.requester_id;
  IF p IS NULL THEN RETURN NEW; END IF;

  SELECT
    upper(COALESCE(jt.short_name, '')) = 'CEO',
    upper(COALESCE(jt.short_name, '')) = ANY(ARRAY['CEO','CFO','COO','CTO','CIO','CRO'])
  INTO requester_is_ceo, requester_is_c_level
  FROM public.job_titles jt
  WHERE jt.id = p.job_title_id;
  requester_is_ceo := COALESCE(requester_is_ceo, false);
  requester_is_c_level := COALESCE(requester_is_c_level, false);

  SELECT p2.id INTO cfo_id
  FROM public.profiles p2
  JOIN public.job_titles jt ON public.has_job_title(p2.id, jt.id)
  WHERE upper(COALESCE(jt.short_name, '')) = 'CFO' AND jt.active AND p2.deleted_at IS NULL AND p2.id <> NEW.requester_id
  ORDER BY p2.created_at LIMIT 1;

  SELECT p2.id INTO ceo_id
  FROM public.profiles p2
  JOIN public.job_titles jt ON public.has_job_title(p2.id, jt.id)
  WHERE upper(COALESCE(jt.short_name, '')) = 'CEO' AND jt.active AND p2.deleted_at IS NULL AND p2.id <> NEW.requester_id
  ORDER BY p2.created_at LIMIT 1;

  SELECT * INTO cfg FROM public.approval_settings WHERE id;

  IF NEW.request_model = 'pagamento' THEN
    IF public.has_job_title_name(NEW.requester_id, 'Financeiro') THEN
      IF cfo_id IS NULL THEN RAISE EXCEPTION 'Nenhum usuário está cadastrado no cargo CFO'; END IF;
      INSERT INTO public.approval_steps(order_id, step_index, role_label, approver_id)
      VALUES (NEW.id, 1, 'Aprovação de Pagamento — CFO', cfo_id);
    ELSE
      added_any := false;
      FOR u IN SELECT p2.id AS user_id FROM public.profiles p2
        WHERE public.has_job_title_name(p2.id, 'Financeiro') AND p2.deleted_at IS NULL AND p2.id <> NEW.requester_id ORDER BY p2.id
      LOOP
        INSERT INTO public.approval_steps(order_id, step_index, role_label, approver_id)
        VALUES (NEW.id, 1, 'Aprovação de Pagamento — Financeiro', u.user_id);
        added_any := true;
      END LOOP;
      IF NOT added_any THEN RAISE EXCEPTION 'Nenhum usuário está cadastrado no cargo Financeiro'; END IF;
    END IF;
    UPDATE public.purchase_orders SET approval_status = 'aguardando_aprovacao' WHERE id = NEW.id;
    RETURN NEW;
  END IF;

  IF cfo_id IS NOT NULL THEN final_id := cfo_id; final_lbl := 'Aprovação final — CFO';
  ELSIF ceo_id IS NOT NULL THEN final_id := ceo_id; final_lbl := 'Aprovação final — CEO';
  ELSE final_id := NULL;
  END IF;

  IF requester_is_c_level THEN
    final_id := NULL;
    final_lbl := NULL;
  END IF;

  IF NEW.request_model = 'dispositivos' THEN
    IF qty <= COALESCE(p.device_approval_limit, 0) THEN max_levels := 0; auto_ok := true;
    ELSIF qty <= COALESCE(p.device_tier2_limit, 0) THEN max_levels := 1;
    ELSIF requester_is_c_level THEN max_levels := 1;
    ELSIF qty <= COALESCE(p.device_tier3_limit, 0) THEN max_levels := 2;
    ELSE max_levels := 5;
    END IF;
  ELSE
    IF v <= COALESCE(p.approval_limit, 0) THEN max_levels := 0; auto_ok := true;
    ELSIF v <= COALESCE(p.tier2_limit, 50000) THEN max_levels := 1;
    ELSIF requester_is_c_level THEN max_levels := 1;
    ELSIF v <= COALESCE(p.tier3_limit, 250000) THEN max_levels := 2;
    ELSE max_levels := 5;
    END IF;

    IF cfg IS NOT NULL AND cfg.dual_approval_enabled AND v > COALESCE(cfg.dual_approval_threshold, 100000) THEN
      auto_ok := false;
    END IF;
  END IF;

  IF NOT auto_ok THEN
    IF requester_is_ceo THEN
      IF cfg.ceo_approver_job_title_id IS NULL THEN
        RAISE EXCEPTION 'Defina o aprovador de despesas do CEO no Organograma de Aprovação.';
      END IF;
      SELECT jt.name INTO nxt_name FROM public.job_titles jt WHERE jt.id = cfg.ceo_approver_job_title_id AND jt.active;
      IF nxt_name IS NULL OR upper(nxt_name) LIKE '%CONSELHO%' THEN
        RAISE EXCEPTION 'O aprovador de despesas do CEO deve ser um cargo ativo e não pode ser o Conselho de Administração.';
      END IF;
      FOR u IN SELECT p2.id AS user_id FROM public.profiles p2
        WHERE public.has_job_title(p2.id, cfg.ceo_approver_job_title_id) AND p2.deleted_at IS NULL AND p2.id <> NEW.requester_id ORDER BY p2.id
      LOOP
        idx := idx + 1;
        INSERT INTO public.approval_steps(order_id, step_index, role_label, approver_id)
        VALUES (NEW.id, idx, 'Aprovação do CEO — ' || nxt_name, u.user_id);
        seen := array_append(seen, u.user_id);
      END LOOP;
      IF idx = 0 THEN RAISE EXCEPTION 'Nenhum usuário ativo ocupa o cargo aprovador de despesas do CEO.'; END IF;
    ELSE
      cur_title := p.job_title_id;
      WHILE levels_used < max_levels AND hops < 100 LOOP
        hops := hops + 1;
        IF cur_title IS NULL THEN EXIT; END IF;
        SELECT h.approver_job_title_id, jt.name INTO nxt_title, nxt_name
        FROM public.job_title_hierarchy h LEFT JOIN public.job_titles jt ON jt.id = h.approver_job_title_id
        WHERE h.job_title_id = cur_title;
        EXIT WHEN nxt_title IS NULL;
        EXIT WHEN nxt_title = ANY(seen_titles);
        EXIT WHEN upper(COALESCE(nxt_name, '')) LIKE '%CONSELHO%';
        seen_titles := array_append(seen_titles, nxt_title);
        added_any := false;
        FOR u IN SELECT p2.id AS user_id FROM public.profiles p2
          WHERE public.has_job_title(p2.id, nxt_title) AND p2.deleted_at IS NULL AND p2.id <> NEW.requester_id ORDER BY p2.id
        LOOP
          IF NOT (u.user_id = ANY(seen)) AND (final_id IS NULL OR u.user_id <> final_id) THEN
            idx := idx + 1;
            INSERT INTO public.approval_steps(order_id, step_index, role_label, approver_id)
            VALUES (NEW.id, idx, 'Aprovação — ' || nxt_name, u.user_id);
            seen := array_append(seen, u.user_id);
            added_any := true;
          END IF;
        END LOOP;
        IF added_any THEN levels_used := levels_used + 1; END IF;
        cur_title := nxt_title;
      END LOOP;
    END IF;

    FOR r IN SELECT * FROM public.approval_rules WHERE active AND
      (request_types IS NULL OR cardinality(request_types) = 0 OR NEW.request_type = ANY(request_types) OR NEW.request_model = ANY(request_types))
      ORDER BY position, created_at
    LOOP
      IF (r.approver_id IS NULL OR NOT (r.approver_id = ANY(seen))) AND (final_id IS NULL OR r.approver_id IS DISTINCT FROM final_id) THEN
        idx := idx + 1;
        INSERT INTO public.approval_steps(order_id, step_index, role_label, approver_id)
        VALUES (NEW.id, idx, r.name, r.approver_id);
        IF r.approver_id IS NOT NULL THEN seen := array_append(seen, r.approver_id); END IF;
      END IF;
    END LOOP;

    IF NEW.request_model <> 'dispositivos' AND cfg IS NOT NULL AND cfg.dual_approval_enabled AND v > COALESCE(cfg.dual_approval_threshold, 100000) THEN
      IF cfg.dual_approval_job_title_1_id IS NULL OR cfg.dual_approval_job_title_2_id IS NULL THEN
        RAISE EXCEPTION 'Defina os dois cargos da aprovação conjunta.';
      END IF;
      IF cfg.dual_approval_job_title_1_id = cfg.dual_approval_job_title_2_id THEN
        RAISE EXCEPTION 'Os cargos da aprovação conjunta devem ser diferentes.';
      END IF;

      dual_idx := idx + 1;
      FOR dual_title IN
        SELECT jt.id, jt.name
        FROM public.job_titles jt
        WHERE jt.id IN (cfg.dual_approval_job_title_1_id, cfg.dual_approval_job_title_2_id)
          AND jt.active
        ORDER BY CASE WHEN jt.id = cfg.dual_approval_job_title_1_id THEN 1 ELSE 2 END
      LOOP
        added_any := false;
        FOR u IN
          SELECT p2.id AS user_id
          FROM public.profiles p2
          WHERE public.has_job_title(p2.id, dual_title.id)
            AND p2.deleted_at IS NULL
            AND p2.id <> NEW.requester_id
          ORDER BY p2.created_at
          LIMIT 1
        LOOP
          added_any := true;
          IF NOT (u.user_id = ANY(seen)) THEN
            INSERT INTO public.approval_steps(order_id, step_index, role_label, approver_id)
            VALUES (NEW.id, dual_idx, 'Aprovação conjunta — ' || dual_title.name, u.user_id);
            seen := array_append(seen, u.user_id);
            idx := dual_idx;
          END IF;
        END LOOP;
        IF NOT added_any AND NOT public.has_job_title(NEW.requester_id, dual_title.id) THEN
          RAISE EXCEPTION 'Nenhum usuário ativo ocupa o cargo % da aprovação conjunta.', dual_title.name;
        END IF;
      END LOOP;

      IF NOT EXISTS (
        SELECT 1 FROM public.job_titles jt
        WHERE jt.id = cfg.dual_approval_job_title_1_id AND jt.active
      ) OR NOT EXISTS (
        SELECT 1 FROM public.job_titles jt
        WHERE jt.id = cfg.dual_approval_job_title_2_id AND jt.active
      ) THEN
        RAISE EXCEPTION 'Os dois cargos da aprovação conjunta devem estar ativos.';
      END IF;
    END IF;
  END IF;

  IF NOT requester_is_ceo AND NOT auto_ok AND max_levels > 2 AND final_id IS NOT NULL AND NOT (final_id = ANY(seen)) THEN
    idx := idx + 1;
    INSERT INTO public.approval_steps(order_id, step_index, role_label, approver_id)
    VALUES (NEW.id, idx, final_lbl, final_id);
  END IF;

  IF idx = 0 THEN
    UPDATE public.purchase_orders SET approval_status = 'aprovado', approved_at = COALESCE(approved_at, now())
    WHERE id = NEW.id AND approval_status <> 'aprovado';
  ELSE
    UPDATE public.purchase_orders SET approval_status = 'aguardando_aprovacao'
    WHERE id = NEW.id AND approval_status = 'aprovado';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.build_approval_chain() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.build_approval_chain() TO service_role;