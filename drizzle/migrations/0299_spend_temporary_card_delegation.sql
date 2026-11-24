CREATE TABLE public.spend_card_delegations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 card_id uuid NOT NULL REFERENCES public.spend_cards(id),
 delegate_id uuid NOT NULL,
 granted_by uuid NOT NULL,
 expires_at date NOT NULL,
 revoked_at timestamptz,
 revoked_by uuid,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.spend_card_delegations ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.spend_card_delegations TO authenticated;
CREATE INDEX spend_card_delegations_lookup ON public.spend_card_delegations(delegate_id,card_id);
ALTER TABLE public.spend_receipts ADD COLUMN submitted_by uuid DEFAULT auth.uid();

CREATE FUNCTION public.spend_card_delegate(_card uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.spend_role() IS NOT NULL AND EXISTS(SELECT 1 FROM public.spend_card_delegations d JOIN public.spend_cards c ON c.id=d.card_id AND c.active WHERE d.card_id=_card AND d.delegate_id=auth.uid() AND d.revoked_at IS NULL AND d.expires_at>=current_date) $$;
REVOKE ALL ON FUNCTION public.spend_card_delegate(uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.spend_card_delegate(uuid) TO authenticated;

CREATE POLICY spend_card_delegations_read ON public.spend_card_delegations FOR SELECT TO authenticated USING (delegate_id=auth.uid() OR public.spend_card_access(card_id));

CREATE OR REPLACE FUNCTION public.spend_storage_access(_name text) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ BEGIN RETURN EXISTS(SELECT 1 FROM public.spend_cards c WHERE c.company_key::text=split_part(_name,'/',1) AND c.id::text=split_part(_name,'/',3) AND split_part(_name,'/',2) ~ '^[0-9]{4}-[0-9]{2}$' AND (public.spend_card_access(c.id) OR (public.spend_card_delegate(c.id) AND NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='spend-files' AND o.name=_name AND o.owner_id IS DISTINCT FROM auth.uid()::text)))); END $$;

CREATE FUNCTION public.spend_delegation(_action text,_data jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE c public.spend_cards; d public.spend_card_delegations; BEGIN
 IF public.spend_role() IS NULL THEN RAISE EXCEPTION 'Acesso não autorizado'; END IF;
 IF _action='grant' THEN
  SELECT * INTO c FROM public.spend_cards WHERE id=(_data->>'card_id')::uuid AND active;
  IF c.id IS NULL OR c.holder_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Somente o portador pode autorizar o uso do cartão'; END IF;
  IF (_data->>'delegate_id')::uuid=auth.uid() OR NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=(_data->>'delegate_id')::uuid AND p.is_active AND p.deleted_at IS NULL AND private.has_app_access(p.id,'spend')) THEN RAISE EXCEPTION 'Usuário sem acesso ao Spend'; END IF;
  IF (_data->>'expires_at')::date<current_date OR (_data->>'expires_at')::date>current_date+90 THEN RAISE EXCEPTION 'Informe validade entre hoje e 90 dias'; END IF;
  UPDATE public.spend_card_delegations SET revoked_at=now(),revoked_by=auth.uid() WHERE card_id=c.id AND delegate_id=(_data->>'delegate_id')::uuid AND revoked_at IS NULL;
  INSERT INTO public.spend_card_delegations(card_id,delegate_id,granted_by,expires_at) VALUES(c.id,(_data->>'delegate_id')::uuid,auth.uid(),(_data->>'expires_at')::date) RETURNING * INTO d;
  INSERT INTO public.spend_logs(card_id,actor_id,action,details) VALUES(c.id,auth.uid(),'Autorização temporária',to_jsonb(d));
  RETURN to_jsonb(d);
 ELSIF _action='revoke' THEN
  SELECT * INTO d FROM public.spend_card_delegations WHERE id=(_data->>'id')::uuid FOR UPDATE;
  SELECT * INTO c FROM public.spend_cards WHERE id=d.card_id;
  IF d.id IS NULL OR (c.holder_id IS DISTINCT FROM auth.uid() AND public.spend_role()<>'finance') THEN RAISE EXCEPTION 'Autorização não encontrada'; END IF;
  UPDATE public.spend_card_delegations SET revoked_at=now(),revoked_by=auth.uid() WHERE id=d.id AND revoked_at IS NULL;
  INSERT INTO public.spend_logs(card_id,actor_id,action,details) VALUES(c.id,auth.uid(),'Autorização revogada',jsonb_build_object('delegation_id',d.id,'delegate_id',d.delegate_id));
  RETURN jsonb_build_object('ok',true);
 END IF;
 RAISE EXCEPTION 'Ação inválida';
END $$;
REVOKE ALL ON FUNCTION public.spend_delegation(text,jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.spend_delegation(text,jsonb) TO authenticated;

DO $m$ DECLARE d text:=pg_get_functiondef('public.spend_action(text,jsonb)'::regprocedure); o text:='IF c.id IS NULL OR NOT public.spend_card_access(c.id) THEN'; BEGIN
 IF strpos(d,o)=0 THEN RAISE EXCEPTION 'spend_action card guard not found'; END IF;
 d:=replace(d,o,'IF c.id IS NULL OR NOT (public.spend_card_access(c.id) OR (receipt.id IS NULL AND public.spend_card_delegate(c.id) AND _data->>''payment_source''=''myio_card'')) THEN');
 EXECUTE d; END $m$;

DO $m$ DECLARE d text:=pg_get_functiondef('public.spend_workspace()'::regprocedure); BEGIN
 d:=replace(d,'FROM public.spend_cards c WHERE public.spend_card_access(c.id))','FROM public.spend_cards c WHERE public.spend_card_access(c.id) OR public.spend_card_delegate(c.id))');
 d:=replace(d,'FROM public.spend_receipts x WHERE public.spend_card_access(x.card_id))','FROM public.spend_receipts x WHERE public.spend_card_access(x.card_id) OR (x.submitted_by=auth.uid() AND public.spend_card_delegate(x.card_id)))');
 d:=replace(d,'(r=''finance'' OR p.id=auth.uid())','(r=''finance'' OR p.id=auth.uid() OR private.has_app_access(p.id,''spend''))');
 d:=replace(d,'''settings'',','''delegations'',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC) FROM public.spend_card_delegations x WHERE x.revoked_at IS NULL AND x.expires_at>=current_date AND (x.delegate_id=auth.uid() OR public.spend_card_access(x.card_id))),''[]''),''settings'',');
 IF strpos(d,'spend_card_delegate(x.card_id)')=0 OR strpos(d,'''delegations''')=0 THEN RAISE EXCEPTION 'workspace patch failed'; END IF;
 EXECUTE d; END $m$;