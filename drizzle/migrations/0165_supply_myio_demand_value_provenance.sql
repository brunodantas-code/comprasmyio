ALTER TABLE public.purchase_orders ADD COLUMN source_myio_order_item_id uuid REFERENCES public.myio_order_items(id);
COMMENT ON COLUMN public.purchase_orders.source_myio_order_item_id IS 'Source item for automatic Myio demand purchases; validated before allowing an unquoted purchase.';
CREATE OR REPLACE FUNCTION public.validate_new_supply_request_value()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE source_project uuid; source_product text; source_quantity integer;
BEGIN
  IF NEW.source_myio_order_item_id IS NOT NULL THEN
    SELECT o.project_id, i.product, i.quantity INTO source_project, source_product, source_quantity
    FROM public.myio_order_items i JOIN public.myio_orders o ON o.id = i.order_id
    WHERE i.id = NEW.source_myio_order_item_id;
    IF NOT FOUND OR source_project IS NULL OR NEW.project_id IS DISTINCT FROM source_project
       OR NEW.request_model <> 'materiais' OR NEW.requester_id IS DISTINCT FROM auth.uid()
       OR lower(btrim(NEW.item_name)) IS DISTINCT FROM lower(btrim(source_product))
       OR NEW.quantity <= 0 OR NEW.quantity > source_quantity THEN
      RAISE EXCEPTION 'Demanda Myio inválida ou sem acesso ao pedido de origem.' USING ERRCODE = '23514';
    END IF;
    IF NOT (
      (NEW.material_id IS NOT NULL AND NEW.terceiros_material_id IS NULL AND EXISTS (
        SELECT 1 FROM public.materials m WHERE m.id = NEW.material_id AND NOT COALESCE(m.is_manufactured, false) AND lower(btrim(m.name)) = lower(btrim(source_product))
      )) OR
      (NEW.terceiros_material_id IS NOT NULL AND NEW.material_id IS NULL AND EXISTS (
        SELECT 1 FROM public.terceiros_materials m WHERE m.id = NEW.terceiros_material_id AND lower(btrim(m.name)) = lower(btrim(source_product))
      ))
    ) THEN
      RAISE EXCEPTION 'A demanda deve usar um item cadastrado e comprável.' USING ERRCODE = '23514';
    END IF;
    IF NEW.estimated_value = 0 THEN RETURN NEW; END IF;
  END IF;
  IF NEW.request_model IN ('servicos', 'materiais', 'viagens')
     AND (NEW.estimated_value IS NULL OR NEW.estimated_value <= 0 OR NEW.estimated_value::text IN ('NaN', 'Infinity', '-Infinity') OR NEW.estimated_value > 1000000000) THEN
    RAISE EXCEPTION 'Informe o valor estimado maior que zero para Serviços, Materiais e Viagens.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;