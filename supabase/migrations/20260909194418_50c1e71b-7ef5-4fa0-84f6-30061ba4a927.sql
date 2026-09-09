ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS approval_number text;

CREATE OR REPLACE FUNCTION public.set_approval_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d text;
  seq integer;
BEGIN
  IF NEW.approval_number IS NOT NULL THEN RETURN NEW; END IF;
  d := to_char((COALESCE(NEW.created_at, now()) AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYYMMDD');
  SELECT COALESCE(MAX(substring(approval_number from 9 for 4)::int), 0) + 1
    INTO seq
    FROM public.purchase_orders
   WHERE approval_number LIKE d || '%';
  IF seq > 9999 THEN
    RAISE EXCEPTION 'Limite de 9999 solicitações por dia atingido';
  END IF;
  NEW.approval_number := d || lpad(seq::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_approval_number ON public.purchase_orders;
CREATE TRIGGER trg_set_approval_number
BEFORE INSERT ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.set_approval_number();

WITH numbered AS (
  SELECT id,
         to_char((created_at AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYYMMDD') AS d,
         row_number() OVER (
           PARTITION BY (created_at AT TIME ZONE 'America/Sao_Paulo')::date
           ORDER BY created_at, id
         ) AS rn
  FROM public.purchase_orders
  WHERE approval_number IS NULL
)
UPDATE public.purchase_orders po
   SET approval_number = n.d || lpad(n.rn::text, 4, '0')
  FROM numbered n
 WHERE po.id = n.id;

CREATE UNIQUE INDEX IF NOT EXISTS purchase_orders_approval_number_key ON public.purchase_orders (approval_number);