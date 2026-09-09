DO $$
DECLARE
  v_new_id uuid;
  v_material uuid := '39b13cc7-e62e-4c68-ab18-8556f0bf47e9';
  v_order uuid := 'bdf4b5f6-1ecc-4b0e-a8e5-11491db60fae';
  v_move uuid := 'f6f524e5-a925-4dd1-bc9d-3001dcc112e6';
BEGIN
  INSERT INTO public.terceiros_materials (name, link, created_by)
  SELECT name, link, created_by FROM public.materials WHERE id = v_material
  RETURNING id INTO v_new_id;

  UPDATE public.purchase_orders
     SET terceiros_material_id = v_new_id, material_id = NULL
   WHERE id = v_order;

  INSERT INTO public.terceiros_movements (material_id, quantity, type, reason, order_id, created_by, created_at)
  SELECT v_new_id, quantity, type, reason, order_id, created_by, created_at
    FROM public.stock_movements WHERE id = v_move;

  DELETE FROM public.stock_movements WHERE id = v_move;
  DELETE FROM public.materials WHERE id = v_material;
END $$;