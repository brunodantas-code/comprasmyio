DO $do$
DECLARE d text; o text:=$a$ IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(NEW.attachments,'[]'::jsonb)) a WHERE$a$;
BEGIN
 d:=pg_get_functiondef('public.spend_guard_reimbursement_order()'::regprocedure);
 IF (length(d)-length(replace(d,o,'')))/length(o)<>1 THEN RAISE EXCEPTION 'trecho não encontrado'; END IF;
 d:=replace(d,o,$a$ IF NOT r.without_receipt AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(NEW.attachments,'[]'::jsonb)) a WHERE$a$);
 EXECUTE d;
END $do$;