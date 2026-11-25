DO $m$
DECLARE d text; a text;
BEGIN
 SELECT pg_get_functiondef('public.spend_installment_reuse()'::regprocedure) INTO d;
 a:=$x$ELSIF TG_OP='UPDATE' AND NEW.receipt_id IS NOT NULL AND OLD.receipt_id IS NULL AND NEW.installment_source_line_id IS NULL THEN$x$;
 IF strpos(d,a)=0 THEN RAISE EXCEPTION 'anchor not found'; END IF;
 d:=replace(d,a,$x$ELSIF NEW.receipt_id IS NOT NULL AND NEW.installment_source_line_id IS NULL AND (TG_OP='INSERT' OR OLD.receipt_id IS NULL) THEN$x$);
 EXECUTE d;
END $m$;