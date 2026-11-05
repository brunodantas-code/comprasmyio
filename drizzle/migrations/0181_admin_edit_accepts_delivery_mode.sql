DO $do$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.admin_edit_purchase_approval(uuid,jsonb,jsonb)'::regprocedure);
  IF position('delivery_mode' in d) = 0 THEN
    d := replace(d, $r$delivery_point = NULLIF(_changes->>'delivery_point', ''),$r$,
      $r$delivery_point = NULLIF(_changes->>'delivery_point', ''), delivery_mode = CASE WHEN _changes->>'delivery_mode' IN ('entrega','retirada') THEN _changes->>'delivery_mode' ELSE _old.delivery_mode END,$r$);
    d := replace(d, $r$OR _old.delivery_point IS DISTINCT FROM NULLIF(_changes->>'delivery_point', '') THEN$r$,
      $r$OR _old.delivery_point IS DISTINCT FROM NULLIF(_changes->>'delivery_point', '') OR (_changes ? 'delivery_mode' AND _old.delivery_mode IS DISTINCT FROM _changes->>'delivery_mode') THEN$r$);
    IF position('delivery_mode' in d) = 0 THEN RAISE EXCEPTION 'patch failed'; END IF;
    EXECUTE d;
  END IF;
END $do$;