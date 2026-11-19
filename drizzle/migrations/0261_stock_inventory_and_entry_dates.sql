ALTER TABLE public.stock_movements ADD COLUMN entry_date date;
ALTER TABLE public.terceiros_movements ADD COLUMN entry_date date;
CREATE TABLE public.stock_inventories (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK(length(trim(name))>0), area text NOT NULL CHECK(area IN ('fabrica','almoxarifado_geral','terceiros','almoxarifado')), inventory_date date NOT NULL, counters text[] NOT NULL CHECK(cardinality(counters)>0), recurrence_months integer NOT NULL DEFAULT 0 CHECK(recurrence_months IN (0,1,3,6,12)), next_date date, status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','completed')), items jsonb NOT NULL DEFAULT '[]', created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
GRANT SELECT ON public.stock_inventories TO authenticated;
GRANT ALL ON public.stock_inventories TO service_role;
ALTER TABLE public.stock_inventories ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.can_inventory_area(_area text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.security_app_access(ARRAY['supply']) AND public.security_supply_menu_access(ARRAY[CASE _area WHEN 'fabrica' THEN 'armazem_fabrica' WHEN 'almoxarifado_geral' THEN 'armazem_almoxarifado' WHEN 'terceiros' THEN 'armazem_estoque_myio' WHEN 'almoxarifado' THEN 'armazem_estoque_myio' ELSE '__invalid__' END]); $$;
REVOKE ALL ON FUNCTION public.can_inventory_area(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_inventory_area(text) TO authenticated;
CREATE POLICY inventory_read ON public.stock_inventories FOR SELECT TO authenticated USING(public.can_inventory_area(area));
CREATE FUNCTION public.save_stock_inventory(_id uuid, _name text, _area text, _date date, _counters text[], _months integer, _items jsonb, _complete boolean DEFAULT false) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE inv public.stock_inventories; item jsonb; mid uuid; bal numeric; counted numeric; delta numeric; output jsonb:='[]'; ids uuid[]:='{}'; result uuid:=coalesce(_id,gen_random_uuid());
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_inventory_area(_area) THEN RAISE EXCEPTION 'Sem acesso a este estoque'; END IF;
 IF _date IS NULL OR nullif(trim(_name),'') IS NULL OR _months NOT IN (0,1,3,6,12) OR _months IS NULL OR cardinality(_counters) IS NULL OR cardinality(_counters)=0 OR EXISTS(SELECT 1 FROM unnest(_counters) c WHERE c IS NULL OR trim(c)='') THEN RAISE EXCEPTION 'Informe nome, data, inventariantes e recorrência'; END IF;
 IF jsonb_typeof(_items) IS DISTINCT FROM 'array' OR jsonb_array_length(_items)=0 THEN RAISE EXCEPTION 'Informe os itens contados'; END IF;
 IF _id IS NOT NULL THEN SELECT * INTO inv FROM public.stock_inventories WHERE id=_id FOR UPDATE; IF inv.id IS NULL OR inv.area<>_area OR inv.status='completed' THEN RAISE EXCEPTION 'Inventário indisponível ou já concluído'; END IF; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(_items) LOOP
  mid:=(item->>'material_id')::uuid;
  IF mid=ANY(ids) THEN RAISE EXCEPTION 'Item repetido'; END IF; ids:=array_append(ids,mid);
  IF _area='terceiros' THEN
   PERFORM id FROM public.terceiros_materials WHERE id=mid FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Item não pertence a este estoque'; END IF;
   SELECT balance INTO bal FROM public.terceiros_material_stock WHERE material_id=mid;
  ELSE
   PERFORM id FROM public.materials WHERE id=mid AND location=_area AND name !~ ' — Caixa de [0-9]+$' AND (_area<>'fabrica' OR NOT coalesce(is_manufactured,false)) FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Item não pertence a este estoque'; END IF;
   SELECT balance INTO bal FROM public.material_stock WHERE material_id=mid;
  END IF;
  counted:=nullif(item->>'counted','')::numeric;
  IF counted<0 OR counted::text IN ('NaN','Infinity','-Infinity') OR (_complete AND counted IS NULL) THEN RAISE EXCEPTION 'Informe uma contagem válida para cada item'; END IF;
  IF _complete AND (item->>'balance')::numeric IS DISTINCT FROM bal THEN RAISE EXCEPTION 'O saldo mudou durante a contagem. Salve e reabra o inventário antes de concluir'; END IF;
  delta:=counted-bal;
  IF _complete AND delta<>0 THEN
   IF _area='terceiros' THEN INSERT INTO public.terceiros_movements(material_id,quantity,type,reason,created_by,responsible,entry_date) VALUES(mid,abs(delta),CASE WHEN delta>0 THEN 'entrada'::public.stock_movement_type ELSE 'saida'::public.stock_movement_type END,'Inventário: '||trim(_name)||' · '||result,auth.uid(),array_to_string(_counters,', '),_date);
   ELSE INSERT INTO public.stock_movements(material_id,quantity,type,reason,created_by,responsible,entry_date) VALUES(mid,abs(delta),CASE WHEN delta>0 THEN 'entrada'::public.stock_movement_type ELSE 'saida'::public.stock_movement_type END,'Inventário: '||trim(_name)||' · '||result,auth.uid(),array_to_string(_counters,', '),_date); END IF;
  END IF;
  output:=output||jsonb_build_array(item||jsonb_build_object('balance',bal,'counted',counted,'difference',delta));
 END LOOP;
 INSERT INTO public.stock_inventories(id,name,area,inventory_date,counters,recurrence_months,next_date,status,items,created_by,completed_at)
 VALUES(result,trim(_name),_area,_date,_counters,_months,CASE WHEN _complete AND _months>0 THEN (_date+make_interval(months=>_months))::date END,CASE WHEN _complete THEN 'completed' ELSE 'draft' END,output,auth.uid(),CASE WHEN _complete THEN now() END)
 ON CONFLICT(id) DO UPDATE SET name=excluded.name,inventory_date=excluded.inventory_date,counters=excluded.counters,recurrence_months=excluded.recurrence_months,next_date=excluded.next_date,status=excluded.status,items=excluded.items,completed_at=excluded.completed_at;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.save_stock_inventory(uuid,text,text,date,text[],integer,jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_stock_inventory(uuid,text,text,date,text[],integer,jsonb,boolean) TO authenticated;