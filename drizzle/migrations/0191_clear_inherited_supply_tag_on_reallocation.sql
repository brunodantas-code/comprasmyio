CREATE OR REPLACE FUNCTION public.validate_purchase_order_tag()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tag_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.allocation_type IS DISTINCT FROM 'interna' THEN
    -- Allocation-only edits retain the old tag implicitly. Remove that inherited
    -- association for both requester updates and the admin approval RPC.
    IF TG_OP = 'UPDATE' THEN
      IF OLD.allocation_type = 'interna'
         AND NEW.allocation_type IN ('projeto', 'cliente', 'estoque')
         AND NEW.tag_id IS NOT DISTINCT FROM OLD.tag_id THEN
        NEW.tag_id := NULL;
        RETURN NEW;
      END IF;
    END IF;
    RAISE EXCEPTION 'Etiqueta só pode ser usada em solicitações Internas.';
  END IF;
  IF (TG_OP = 'INSERT' OR NEW.tag_id IS DISTINCT FROM OLD.tag_id)
     AND NOT EXISTS (SELECT 1 FROM public.supply_tags WHERE id = NEW.tag_id AND active) THEN
    RAISE EXCEPTION 'Etiqueta inativa ou inexistente.';
  END IF;
  RETURN NEW;
END $$;