DO $$
DECLARE
  definition text;
  original text := $needle$    UPDATE public.purchase_orders SET approval_status = 'aguardando_aprovacao' WHERE id = NEW.id;
    RETURN NEW;
  END IF;$needle$;
  replacement text := $body$    IF cfg IS NOT NULL AND cfg.dual_approval_enabled AND v > COALESCE(cfg.dual_approval_threshold, 100000) THEN
      IF cfg.dual_approval_job_title_1_id IS NULL OR cfg.dual_approval_job_title_2_id IS NULL
         OR cfg.dual_approval_job_title_1_id = cfg.dual_approval_job_title_2_id THEN
        RAISE EXCEPTION 'Defina dois cargos diferentes para a aprovação conjunta.';
      END IF;
      FOR dual_title IN
        SELECT jt.id, jt.name, jt.active
        FROM public.job_titles jt
        WHERE jt.id IN (cfg.dual_approval_job_title_1_id, cfg.dual_approval_job_title_2_id)
        ORDER BY CASE WHEN jt.id = cfg.dual_approval_job_title_1_id THEN 1 ELSE 2 END
      LOOP
        IF NOT dual_title.active THEN
          RAISE EXCEPTION 'Os dois cargos da aprovação conjunta devem estar ativos.';
        END IF;
        -- The requester never approves their own payment, including an additional job title.
        IF public.has_job_title(NEW.requester_id, dual_title.id) THEN CONTINUE; END IF;
        SELECT p2.id INTO u
        FROM public.profiles p2
        WHERE public.has_job_title(p2.id, dual_title.id)
          AND p2.deleted_at IS NULL AND p2.id <> NEW.requester_id
        ORDER BY p2.created_at LIMIT 1;
        IF u.id IS NULL THEN
          RAISE EXCEPTION 'Nenhum usuário ativo ocupa o cargo % da aprovação conjunta.', dual_title.name;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.approval_steps s WHERE s.order_id = NEW.id AND s.approver_id = u.id) THEN
          INSERT INTO public.approval_steps(order_id, step_index, role_label, approver_id)
          VALUES (NEW.id, 1, 'Aprovação conjunta — ' || dual_title.name, u.id);
        END IF;
      END LOOP;
    END IF;
    UPDATE public.purchase_orders SET approval_status = 'aguardando_aprovacao' WHERE id = NEW.id;
    RETURN NEW;
  END IF;$body$;
BEGIN
  SELECT pg_get_functiondef('public.build_approval_chain()'::regprocedure) INTO definition;
  IF position(original IN definition) = 0 THEN
    RAISE EXCEPTION 'A regra de pagamento mudou; revisar antes de alterar.';
  END IF;
  definition := replace(definition, original, replacement);
  -- A record variable must be assigned from a row, rather than from a scalar UUID.
  definition := replace(definition, 'SELECT p2.id INTO u\n        FROM public.profiles p2\n        WHERE public.has_job_title(p2.id, dual_title.id)', 'SELECT p2.id AS id INTO u\n        FROM public.profiles p2\n        WHERE public.has_job_title(p2.id, dual_title.id)');
  EXECUTE definition;
END;
$$;