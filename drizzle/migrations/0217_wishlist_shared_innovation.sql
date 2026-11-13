CREATE TABLE public.wishlist_ideas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 idealizer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
 title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 3 AND 160),
 description text NOT NULL CHECK (char_length(trim(description)) BETWEEN 10 AND 6000),
 expected_result text NOT NULL DEFAULT '' CHECK (char_length(expected_result) <= 3000),
 status text NOT NULL DEFAULT 'ideia' CHECK (status IN ('ideia','em_analise','planejada','pronta_projeto','arquivada')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
GRANT SELECT,INSERT,UPDATE ON public.wishlist_ideas TO authenticated;
GRANT ALL ON public.wishlist_ideas TO service_role;
ALTER TABLE public.wishlist_ideas ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.wishlist_can_access() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_active AND deleted_at IS NULL)
 AND EXISTS(SELECT 1 FROM public.user_app_access WHERE user_id=auth.uid() AND app_key='wishlist');
$$;
REVOKE ALL ON FUNCTION public.wishlist_can_access() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.wishlist_can_access() TO authenticated;
CREATE POLICY wishlist_read ON public.wishlist_ideas FOR SELECT TO authenticated USING(public.wishlist_can_access());
CREATE POLICY wishlist_create ON public.wishlist_ideas FOR INSERT TO authenticated WITH CHECK(public.wishlist_can_access() AND idealizer_id=auth.uid() AND deleted_at IS NULL);
CREATE POLICY wishlist_edit ON public.wishlist_ideas FOR UPDATE TO authenticated USING(public.wishlist_can_access() AND (idealizer_id=auth.uid() OR public.is_erp_admin(auth.uid()))) WITH CHECK(public.wishlist_can_access() AND (idealizer_id=auth.uid() OR public.is_erp_admin(auth.uid())));
CREATE TABLE public.wishlist_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), idea_id uuid NOT NULL REFERENCES public.wishlist_ideas(id) ON DELETE CASCADE,
 author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
 message_type text NOT NULL CHECK(message_type IN ('question','answer','contribution')),
 recipient_id uuid REFERENCES public.profiles(id), parent_message_id uuid REFERENCES public.wishlist_messages(id),
 message text NOT NULL CHECK(char_length(trim(message)) BETWEEN 1 AND 6000), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT ON public.wishlist_messages TO authenticated;
GRANT ALL ON public.wishlist_messages TO service_role;
ALTER TABLE public.wishlist_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY wishlist_messages_read ON public.wishlist_messages FOR SELECT TO authenticated USING(public.wishlist_can_access());
CREATE POLICY wishlist_messages_create ON public.wishlist_messages FOR INSERT TO authenticated WITH CHECK(public.wishlist_can_access() AND author_id=auth.uid() AND EXISTS(SELECT 1 FROM public.wishlist_ideas i WHERE i.id=idea_id AND i.deleted_at IS NULL));
CREATE UNIQUE INDEX wishlist_single_answer ON public.wishlist_messages(parent_message_id) WHERE message_type='answer';
CREATE TABLE public.wishlist_roadmap_steps (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), idea_id uuid NOT NULL REFERENCES public.wishlist_ideas(id) ON DELETE CASCADE,
 title text NOT NULL CHECK(char_length(trim(title)) BETWEEN 3 AND 200), description text NOT NULL DEFAULT '' CHECK(char_length(description)<=3000),
 responsible_id uuid REFERENCES public.profiles(id), due_date date, position integer NOT NULL DEFAULT 0 CHECK(position>=0),
 completed boolean NOT NULL DEFAULT false, completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
GRANT SELECT,INSERT,UPDATE ON public.wishlist_roadmap_steps TO authenticated;
GRANT ALL ON public.wishlist_roadmap_steps TO service_role;
ALTER TABLE public.wishlist_roadmap_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY wishlist_steps_read ON public.wishlist_roadmap_steps FOR SELECT TO authenticated USING(public.wishlist_can_access());
CREATE POLICY wishlist_steps_create ON public.wishlist_roadmap_steps FOR INSERT TO authenticated WITH CHECK(public.wishlist_can_access() AND EXISTS(SELECT 1 FROM public.wishlist_ideas i WHERE i.id=idea_id AND i.deleted_at IS NULL AND (i.idealizer_id=auth.uid() OR public.is_erp_admin(auth.uid()))));
CREATE POLICY wishlist_steps_edit ON public.wishlist_roadmap_steps FOR UPDATE TO authenticated USING(public.wishlist_can_access() AND EXISTS(SELECT 1 FROM public.wishlist_ideas i WHERE i.id=idea_id AND i.deleted_at IS NULL AND (i.idealizer_id=auth.uid() OR public.is_erp_admin(auth.uid()) OR responsible_id=auth.uid()))) WITH CHECK(public.wishlist_can_access());
CREATE TABLE public.wishlist_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), idea_id uuid NOT NULL REFERENCES public.wishlist_ideas(id) ON DELETE CASCADE,
 actor_id uuid REFERENCES public.profiles(id), text text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wishlist_logs TO authenticated;
GRANT ALL ON public.wishlist_logs TO service_role;
ALTER TABLE public.wishlist_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY wishlist_logs_read ON public.wishlist_logs FOR SELECT TO authenticated USING(public.wishlist_can_access());
CREATE INDEX wishlist_messages_idea ON public.wishlist_messages(idea_id,created_at);
CREATE INDEX wishlist_steps_idea ON public.wishlist_roadmap_steps(idea_id,position);
CREATE INDEX wishlist_logs_idea ON public.wishlist_logs(idea_id,created_at);
CREATE OR REPLACE FUNCTION public.guard_wishlist_record() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE parent public.wishlist_messages; original_owner uuid; editor boolean;
BEGIN
 IF auth.role()='service_role' THEN RETURN NEW; END IF;
 IF NOT public.wishlist_can_access() THEN RAISE EXCEPTION 'Acesso ao Wishlist necessário' USING ERRCODE='42501'; END IF;
 IF TG_TABLE_NAME='wishlist_ideas' THEN
  IF TG_OP='INSERT' THEN NEW.idealizer_id:=auth.uid(); NEW.created_at:=now(); NEW.deleted_at:=NULL;
  ELSE
   IF NEW.idealizer_id IS DISTINCT FROM OLD.idealizer_id OR NEW.id<>OLD.id OR NEW.created_at<>OLD.created_at THEN RAISE EXCEPTION 'Idealizador e criação não podem ser alterados'; END IF;
  END IF;
  NEW.updated_at:=now();
 ELSIF TG_TABLE_NAME='wishlist_messages' THEN
  NEW.author_id:=auth.uid(); NEW.created_at:=now();
  IF NEW.message_type='question' THEN
   IF NEW.parent_message_id IS NOT NULL OR NEW.recipient_id IS NULL OR NEW.recipient_id=auth.uid() OR NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.user_app_access a ON a.user_id=p.id AND a.app_key='wishlist' WHERE p.id=NEW.recipient_id AND p.is_active AND p.deleted_at IS NULL) THEN RAISE EXCEPTION 'Selecione outro usuário do Wishlist para responder'; END IF;
  ELSIF NEW.message_type='answer' THEN
   SELECT * INTO parent FROM public.wishlist_messages WHERE id=NEW.parent_message_id;
   IF parent.id IS NULL OR parent.idea_id<>NEW.idea_id OR parent.message_type<>'question' OR parent.recipient_id IS DISTINCT FROM auth.uid() OR parent.author_id=auth.uid() THEN RAISE EXCEPTION 'Resposta deve corresponder a uma pergunta dirigida a você'; END IF;
   NEW.recipient_id:=parent.author_id;
  ELSE
   IF NEW.parent_message_id IS NOT NULL OR NEW.recipient_id IS NOT NULL THEN RAISE EXCEPTION 'Contribuição não possui destinatário ou pergunta vinculada'; END IF;
  END IF;
 ELSIF TG_TABLE_NAME='wishlist_roadmap_steps' THEN
  SELECT idealizer_id INTO original_owner FROM public.wishlist_ideas WHERE id=NEW.idea_id AND deleted_at IS NULL;
  editor:=original_owner=auth.uid() OR public.is_erp_admin(auth.uid());
  IF TG_OP='UPDATE' THEN
   IF NEW.idea_id<>OLD.idea_id OR NEW.id<>OLD.id OR NEW.created_at<>OLD.created_at THEN RAISE EXCEPTION 'Vínculo da etapa não pode ser alterado'; END IF;
   IF NOT editor AND (OLD.responsible_id IS DISTINCT FROM auth.uid() OR NEW.title<>OLD.title OR NEW.description<>OLD.description OR NEW.responsible_id IS DISTINCT FROM OLD.responsible_id OR NEW.due_date IS DISTINCT FROM OLD.due_date OR NEW.position<>OLD.position OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at) THEN RAISE EXCEPTION 'Somente o idealizador edita o planejamento; responsável pode concluir sua etapa'; END IF;
  ELSIF NOT editor THEN RAISE EXCEPTION 'Somente o idealizador pode criar etapas'; END IF;
  IF NEW.responsible_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.user_app_access a ON a.user_id=p.id AND a.app_key='wishlist' WHERE p.id=NEW.responsible_id AND p.is_active AND p.deleted_at IS NULL) THEN RAISE EXCEPTION 'Responsável indisponível'; END IF;
  IF NEW.completed THEN
   IF TG_OP='INSERT' THEN NEW.completed_at:=now(); ELSIF NOT OLD.completed THEN NEW.completed_at:=now(); ELSE NEW.completed_at:=OLD.completed_at; END IF;
  ELSE NEW.completed_at:=NULL; END IF;
  NEW.updated_at:=now();
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER wishlist_idea_guard BEFORE INSERT OR UPDATE ON public.wishlist_ideas FOR EACH ROW EXECUTE FUNCTION public.guard_wishlist_record();
CREATE TRIGGER wishlist_message_guard BEFORE INSERT ON public.wishlist_messages FOR EACH ROW EXECUTE FUNCTION public.guard_wishlist_record();
CREATE TRIGGER wishlist_step_guard BEFORE INSERT OR UPDATE ON public.wishlist_roadmap_steps FOR EACH ROW EXECUTE FUNCTION public.guard_wishlist_record();
CREATE OR REPLACE FUNCTION public.audit_wishlist_record() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE event text; wish_id uuid;
BEGIN
 IF TG_TABLE_NAME='wishlist_ideas' THEN
  wish_id:=NEW.id;
  IF TG_OP='INSERT' THEN event:='Desejo registrado: '||NEW.title;
  ELSIF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN event:='Desejo excluído: '||NEW.title;
  ELSE event:='Desejo alterado'||E'\nAntes: '||jsonb_build_object('titulo',OLD.title,'descricao',OLD.description,'resultado',OLD.expected_result,'situacao',OLD.status)::text||E'\nDepois: '||jsonb_build_object('titulo',NEW.title,'descricao',NEW.description,'resultado',NEW.expected_result,'situacao',NEW.status)::text; END IF;
 ELSIF TG_TABLE_NAME='wishlist_messages' THEN
  wish_id:=NEW.idea_id; event:=CASE NEW.message_type WHEN 'question' THEN 'Pergunta' WHEN 'answer' THEN 'Resposta' ELSE 'Contribuição' END||': '||NEW.message;
 ELSE
  wish_id:=NEW.idea_id;
  IF TG_OP='INSERT' THEN event:='Etapa criada: '||NEW.title;
  ELSIF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN event:='Etapa excluída: '||NEW.title;
  ELSE event:='Roadmap alterado'||E'\nAntes: '||to_jsonb(OLD)::text||E'\nDepois: '||to_jsonb(NEW)::text; END IF;
 END IF;
 INSERT INTO public.wishlist_logs(idea_id,actor_id,text) VALUES(wish_id,auth.uid(),event);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.audit_wishlist_record() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER wishlist_idea_audit AFTER INSERT OR UPDATE ON public.wishlist_ideas FOR EACH ROW EXECUTE FUNCTION public.audit_wishlist_record();
CREATE TRIGGER wishlist_message_audit AFTER INSERT ON public.wishlist_messages FOR EACH ROW EXECUTE FUNCTION public.audit_wishlist_record();
CREATE TRIGGER wishlist_step_audit AFTER INSERT OR UPDATE ON public.wishlist_roadmap_steps FOR EACH ROW EXECUTE FUNCTION public.audit_wishlist_record();
CREATE OR REPLACE FUNCTION public.wishlist_users() RETURNS TABLE(id uuid,full_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p.id,p.full_name FROM public.profiles p JOIN public.user_app_access a ON a.user_id=p.id AND a.app_key='wishlist' WHERE public.wishlist_can_access() AND p.is_active AND p.deleted_at IS NULL ORDER BY p.full_name;
$$;
REVOKE ALL ON FUNCTION public.wishlist_users() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.wishlist_users() TO authenticated;
CREATE OR REPLACE FUNCTION public.grant_new_user_wishlist() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.is_active AND NEW.deleted_at IS NULL AND EXISTS(SELECT 1 FROM public.erp_apps WHERE key='wishlist' AND active) THEN
 INSERT INTO public.user_app_access(user_id,app_key) VALUES(NEW.id,'wishlist') ON CONFLICT(user_id,app_key) DO NOTHING;
 END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.grant_new_user_wishlist() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER profiles_wishlist_access AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.grant_new_user_wishlist();