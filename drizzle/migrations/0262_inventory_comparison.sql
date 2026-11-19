CREATE OR REPLACE FUNCTION public.inventory_comparison(_area text, _after timestamptz DEFAULT NULL, _until timestamptz DEFAULT NULL) RETURNS TABLE(material_id uuid,purchases numeric,factory_exits numeric) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.can_inventory_area(_area) THEN RAISE EXCEPTION 'Sem acesso a este estoque'; END IF;
 IF _after IS NULL THEN RETURN; END IF;
 IF _area='terceiros' THEN RETURN QUERY SELECT m.material_id,coalesce(sum(m.quantity) FILTER(WHERE m.type='entrada' AND m.order_id IS NOT NULL),0),0::numeric FROM public.terceiros_movements m WHERE m.created_at>_after AND (_until IS NULL OR m.created_at<=_until) GROUP BY m.material_id;
 ELSE RETURN QUERY SELECT m.material_id,coalesce(sum(m.quantity) FILTER(WHERE m.type='entrada' AND m.order_id IS NOT NULL),0),coalesce(sum(m.quantity) FILTER(WHERE m.type='saida' AND coalesce(m.reason,'') NOT LIKE 'Inventário:%' AND _area='fabrica'),0) FROM public.stock_movements m JOIN public.materials a ON a.id=m.material_id AND a.location=_area WHERE m.created_at>_after AND (_until IS NULL OR m.created_at<=_until) GROUP BY m.material_id; END IF;
END $$;
REVOKE ALL ON FUNCTION public.inventory_comparison(text,timestamptz,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.inventory_comparison(text,timestamptz,timestamptz) TO authenticated;
CREATE OR REPLACE FUNCTION public.save_stock_inventory(_id uuid, _name text, _area text, _date date, _counters text[], _months integer, _items jsonb, _complete boolean DEFAULT false) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE inv public.stock_inventories; item jsonb; mid uuid; bal numeric; counted numeric; delta numeric; output jsonb:='[]'; ids uuid[]:='{}'; result uuid:=coalesce(_id,gen_random_uuid());
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_inventory_area(_area) THEN RAISE EXCEPTION 'Sem acesso a este estoque'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(result::text,0));
 IF _date IS NULL OR nullif(trim(_name),'') IS NULL OR _months NOT IN (0,1,3,6,12) OR _months IS NULL OR cardinality(_counters) IS NULL OR cardinality(_counters)=0 OR EXISTS(SELECT 1 FROM unnest(_counters) c WHERE c IS NULL OR trim(c)='') THEN RAISE EXCEPTION 'Informe nome, data, inventariantes e recorrência'; END IF;
 IF jsonb_typeof(_items) IS DISTINCT FROM 'array' OR jsonb_array_length(_items)=0 THEN RAISE EXCEPTION 'Informe os itens contados'; END IF;
 SELECT * INTO inv FROM public.stock_inventories WHERE id=result FOR UPDATE;
 IF inv.id IS NOT NULL AND (inv.area<>_area OR inv.status='completed') THEN RAISE EXCEPTION 'Inventário indisponível ou já concluído'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(_items) ORDER BY value->>'material_id' LOOP
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