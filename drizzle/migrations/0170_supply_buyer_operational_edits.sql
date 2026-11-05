CREATE TABLE public.supply_edit_notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL REFERENCES public.purchase_orders(id),log_id uuid NOT NULL REFERENCES public.order_logs(id),requester_id uuid NOT NULL,actor_id uuid NOT NULL,status text NOT NULL DEFAULT 'pending_setup',created_at timestamptz NOT NULL DEFAULT now(),sent_at timestamptz,last_error text,UNIQUE(log_id));
GRANT SELECT ON public.supply_edit_notifications TO authenticated; GRANT ALL ON public.supply_edit_notifications TO service_role;
ALTER TABLE public.supply_edit_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notification_read ON public.supply_edit_notifications FOR SELECT TO authenticated USING(requester_id=auth.uid() OR actor_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.can_edit_supply_purchase() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.user_app_access WHERE user_id=auth.uid() AND app_key='supply') AND (public.has_role(auth.uid(),'admin') OR public.is_supply_member(auth.uid())); $$;
REVOKE ALL ON FUNCTION public.can_edit_supply_purchase() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.can_edit_supply_purchase() TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.supply_edit_purchase(_order_id uuid,_changes jsonb,_items jsonb,_reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.purchase_orders%ROWTYPE; before_data jsonb; after_data jsonb; before_items jsonb; after_items jsonb; line jsonb; qty integer; val numeric; event_id uuid; cfg public.approval_settings%ROWTYPE; p public.profiles%ROWTYPE; u record; idx integer; review boolean:=false; fields jsonb:='{}'; k text;
BEGIN
 IF NOT public.can_edit_supply_purchase() THEN RAISE EXCEPTION 'Sem permissão para editar compras' USING ERRCODE='42501'; END IF;
 IF length(btrim(coalesce(_reason,''))) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Informe o motivo da alteração'; END IF;
 IF _changes IS NULL OR jsonb_typeof(_changes)<>'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(_changes) k WHERE k NOT IN('item_link','quantity','estimated_value','recipient','delivery_point','deadline_type','deadline_date','delivery_forecast','buyer_notes')) THEN RAISE EXCEPTION 'Campo não permitido'; END IF;
 SELECT * INTO o FROM public.purchase_orders WHERE id=_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
 IF o.status='cancelado' OR o.approval_status='rejeitado' OR o.request_model NOT IN('materiais','servicos','viagens') THEN RAISE EXCEPTION 'Esta solicitação não permite edição operacional'; END IF;
 before_data:=jsonb_build_object('quantity',o.quantity,'estimated_value',o.estimated_value,'recipient',o.recipient,'recipient_user_id',o.recipient_user_id,'delivery_point',o.delivery_point,'item_link',o.item_link,'deadline_type',o.deadline_type,'deadline_date',o.deadline_date,'delivery_forecast',o.delivery_forecast,'buyer_notes',o.buyer_notes);
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'quantity',quantity,'estimated_unit_value',estimated_unit_value,'item_link',item_link) ORDER BY id),'[]') INTO before_items FROM public.purchase_order_items WHERE order_id=_order_id;
 IF _items IS NULL OR jsonb_typeof(_items)<>'array' THEN RAISE EXCEPTION 'Itens inválidos'; END IF;
 IF jsonb_array_length(before_items)>0 THEN
  IF jsonb_array_length(_items)<>jsonb_array_length(before_items) OR (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(_items))<>jsonb_array_length(before_items) THEN RAISE EXCEPTION 'Informe todos os itens uma única vez'; END IF;
  FOR line IN SELECT value FROM jsonb_array_elements(_items) LOOP
   IF jsonb_typeof(line)<>'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(line) k WHERE k NOT IN('id','quantity','estimated_unit_value','item_link')) OR NOT EXISTS(SELECT 1 FROM public.purchase_order_items WHERE id=(line->>'id')::uuid AND order_id=_order_id) THEN RAISE EXCEPTION 'Item não permitido'; END IF;
   qty:=(line->>'quantity')::integer; val:=(line->>'estimated_unit_value')::numeric;
   IF qty IS NULL OR qty<=0 OR val IS NULL OR val<0 OR val::text IN('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Quantidade e valor inválidos'; END IF;
   UPDATE public.purchase_order_items SET quantity=qty,estimated_unit_value=val,item_link=nullif(btrim(line->>'item_link'),'') WHERE id=(line->>'id')::uuid AND (quantity IS DISTINCT FROM qty OR estimated_unit_value IS DISTINCT FROM val OR item_link IS DISTINCT FROM nullif(btrim(line->>'item_link'),''));
  END LOOP;
  SELECT sum(quantity),sum(quantity*estimated_unit_value) INTO qty,val FROM public.purchase_order_items WHERE order_id=_order_id;
 ELSE
  IF jsonb_array_length(_items)>0 THEN RAISE EXCEPTION 'Itens não pertencem à solicitação'; END IF;
  qty:=coalesce((_changes->>'quantity')::integer,o.quantity); val:=coalesce((_changes->>'estimated_value')::numeric,o.estimated_value);
 END IF;
 IF qty IS NULL OR qty<=0 OR val IS NULL OR val<0 OR val::text IN('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Quantidade e valor inválidos'; END IF;
 after_data:=before_data||_changes||jsonb_build_object('quantity',qty,'estimated_value',val);
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'quantity',quantity,'estimated_unit_value',estimated_unit_value,'item_link',item_link) ORDER BY id),'[]') INTO after_items FROM public.purchase_order_items WHERE order_id=_order_id;
 IF before_data=after_data AND before_items=after_items THEN RETURN jsonb_build_object('changed',false); END IF;
 IF qty IS DISTINCT FROM o.quantity OR val IS DISTINCT FROM o.estimated_value THEN UPDATE public.purchase_orders SET quantity=qty,estimated_value=val WHERE id=_order_id; END IF;
 IF after_data->>'recipient' IS DISTINCT FROM o.recipient THEN UPDATE public.purchase_orders SET recipient=after_data->>'recipient',recipient_user_id=NULL WHERE id=_order_id; END IF;
 UPDATE public.purchase_orders SET item_link=nullif(btrim(after_data->>'item_link'),''),delivery_point=nullif(btrim(after_data->>'delivery_point'),''),deadline_type=(after_data->>'deadline_type')::public.deadline_type,deadline_date=nullif(after_data->>'deadline_date','')::date,delivery_forecast=nullif(after_data->>'delivery_forecast','')::date,buyer_notes=nullif(btrim(after_data->>'buyer_notes'),'') WHERE id=_order_id;
 IF val>o.estimated_value AND o.status='pendente' AND o.approval_status='aprovado' THEN
  SELECT * INTO p FROM public.profiles WHERE id=o.requester_id; SELECT * INTO cfg FROM public.approval_settings WHERE id;
  IF val>coalesce(p.approval_limit,0) OR (cfg.dual_approval_enabled AND val>cfg.dual_approval_threshold) THEN
   SELECT coalesce(max(step_index),0)+1 INTO idx FROM public.approval_steps WHERE order_id=_order_id;
   FOR u IN SELECT DISTINCT pr.id FROM public.profiles pr JOIN public.job_titles jt ON public.has_job_title(pr.id,jt.id) WHERE pr.deleted_at IS NULL AND pr.id<>o.requester_id AND jt.active AND (upper(coalesce(jt.short_name,'')) IN('CFO','CEO') OR (cfg.dual_approval_enabled AND val>cfg.dual_approval_threshold AND jt.id IN(cfg.dual_approval_job_title_1_id,cfg.dual_approval_job_title_2_id))) LOOP
    INSERT INTO public.approval_steps(order_id,step_index,role_label,approver_id) VALUES(_order_id,idx,'Revisão de valor pelo Supply',u.id); review:=true;
   END LOOP;
   IF NOT review THEN RAISE EXCEPTION 'Configure aprovadores para revisão do valor antes de salvar'; END IF;
   UPDATE public.purchase_orders SET approval_status='aguardando_aprovacao' WHERE id=_order_id;
  END IF;
 END IF;
 SELECT jsonb_build_object('quantity',quantity,'estimated_value',estimated_value,'recipient',recipient,'recipient_user_id',recipient_user_id,'delivery_point',delivery_point,'item_link',item_link,'deadline_type',deadline_type,'deadline_date',deadline_date,'delivery_forecast',delivery_forecast,'buyer_notes',buyer_notes) INTO after_data FROM public.purchase_orders WHERE id=_order_id;
 FOR k IN SELECT jsonb_object_keys(before_data) LOOP IF before_data->k IS DISTINCT FROM after_data->k THEN fields:=fields||jsonb_build_object(k,jsonb_build_object('antes',before_data->k,'depois',after_data->k)); END IF; END LOOP;
 IF before_items<>after_items THEN fields:=fields||jsonb_build_object('itens',jsonb_build_object('antes',before_items,'depois',after_items)); END IF;
 IF fields='{}' THEN RETURN jsonb_build_object('changed',false); END IF;
 INSERT INTO public.order_logs(order_id,actor_id,action,details) VALUES(_order_id,auth.uid(),'approval_editado_supply',jsonb_build_object('approval',o.approval_number,'motivo',btrim(_reason),'campos',fields,'aprovacao_complementar',review)) RETURNING id INTO event_id;
 INSERT INTO public.supply_edit_notifications(order_id,log_id,requester_id,actor_id) VALUES(_order_id,event_id,o.requester_id,auth.uid());
 RETURN jsonb_build_object('changed',true,'additionalApproval',review,'emailStatus','pending_setup');
END; $$;
REVOKE ALL ON FUNCTION public.supply_edit_purchase(uuid,jsonb,jsonb,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.supply_edit_purchase(uuid,jsonb,jsonb,text) TO authenticated,service_role;