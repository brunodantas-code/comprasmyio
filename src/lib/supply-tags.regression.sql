-- Run with psql -v ON_ERROR_STOP=1 against the configured project database.
-- All fixtures and writes are temporary and rolled back; real orders are untouched.
BEGIN;
CREATE TEMP TABLE monitoring_tag_orders (id int, allocation_type text, tag_id uuid);
INSERT INTO monitoring_tag_orders VALUES
  (1, 'interna', '00000000-0000-0000-0000-000000000001'),
  (2, 'interna', '00000000-0000-0000-0000-000000000001'),
  (3, 'interna', '00000000-0000-0000-0000-000000000001'),
  (4, 'interna', '00000000-0000-0000-0000-000000000001');
CREATE TRIGGER monitoring_tag_guard BEFORE INSERT OR UPDATE OF tag_id, allocation_type
ON monitoring_tag_orders FOR EACH ROW EXECUTE FUNCTION public.validate_purchase_order_tag();
UPDATE monitoring_tag_orders SET allocation_type = 'projeto' WHERE id = 1;
UPDATE monitoring_tag_orders SET allocation_type = 'cliente' WHERE id = 2;
UPDATE monitoring_tag_orders SET allocation_type = 'estoque' WHERE id = 3;
UPDATE monitoring_tag_orders SET allocation_type = 'interna' WHERE id = 4;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM monitoring_tag_orders WHERE id IN (1,2,3) AND tag_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Reallocation must clear inherited tags for Project, Client and Stock';
  END IF;
  IF (SELECT tag_id FROM monitoring_tag_orders WHERE id = 4) IS DISTINCT FROM '00000000-0000-0000-0000-000000000001'::uuid THEN
    RAISE EXCEPTION 'An Internal edit must preserve its existing tag';
  END IF;
  BEGIN
    INSERT INTO monitoring_tag_orders VALUES (5,'estoque','00000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'Unexpected acceptance of new non-Internal tag';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Etiqueta só pode ser usada em solicitações Internas.' THEN RAISE; END IF;
  END;
  BEGIN
    UPDATE monitoring_tag_orders SET allocation_type = 'estoque', tag_id = '00000000-0000-0000-0000-000000000002' WHERE id = 4;
    RAISE EXCEPTION 'Unexpected acceptance of replacement non-Internal tag';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Etiqueta só pode ser usada em solicitações Internas.' THEN RAISE; END IF;
  END;
END $$;
ROLLBACK;