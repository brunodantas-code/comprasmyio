ALTER TABLE public.mytosis_settings ADD COLUMN box_formats jsonb NOT NULL DEFAULT '{}'::jsonb;
UPDATE public.mytosis_settings SET box_formats = (SELECT jsonb_object_agg(shape, box_format || jsonb_build_object('shape',shape)) FROM unnest(ARRAY['process','terminal','document','decision','connector','io','documents','manual','preparation','or','delay']) AS shape);
CREATE OR REPLACE FUNCTION public.mytosis_shape_format(_shape text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT coalesce(box_formats -> _shape, box_format, '{}'::jsonb) || jsonb_build_object('shape',_shape) FROM public.mytosis_settings WHERE id=1
$$;
REVOKE ALL ON FUNCTION public.mytosis_shape_format(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mytosis_shape_format(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.guard_mytosis_layout() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE fields text[] := ARRAY['fill_color','border_color','title_font_size','description_font_size','text_align','text_vertical_align','title_color','control_color']; f jsonb; old_style jsonb; new_style jsonb; patched public.mytosis_nodes;
BEGIN
 IF public.mytosis_role(auth.uid()) = 'admin' THEN RETURN NEW; END IF;
 IF NOT coalesce(public.mytosis_can_edit(auth.uid()),false) THEN RAISE EXCEPTION 'Sem permissão para editar boxes.'; END IF;
 IF TG_OP='UPDATE' AND NEW.shape IS NOT DISTINCT FROM OLD.shape THEN
  SELECT jsonb_object_agg(key,value) INTO old_style FROM jsonb_each(to_jsonb(OLD)) WHERE key=ANY(fields);
  SELECT jsonb_object_agg(key,value) INTO new_style FROM jsonb_each(to_jsonb(NEW)) WHERE key=ANY(fields);
  IF old_style IS DISTINCT FROM new_style OR NEW.custom_format IS DISTINCT FROM OLD.custom_format THEN RAISE EXCEPTION 'Somente Admin pode alterar o layout dos boxes.'; END IF;
  RETURN NEW;
 END IF;
 f := public.mytosis_shape_format(NEW.shape);
 SELECT jsonb_object_agg(key,value) INTO new_style FROM jsonb_each(f) WHERE key=ANY(fields);
 patched := jsonb_populate_record(NEW, new_style || jsonb_build_object('custom_format',false));
 NEW := patched;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_mytosis_layout BEFORE INSERT OR UPDATE ON public.mytosis_nodes FOR EACH ROW EXECUTE FUNCTION public.guard_mytosis_layout();
CREATE OR REPLACE FUNCTION public.guard_mytosis_connector_layout() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF public.mytosis_role(auth.uid()) = 'admin' THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN NEW.style := 'arrow'; NEW.color := NULL;
 ELSIF NEW.style IS DISTINCT FROM OLD.style OR NEW.color IS DISTINCT FROM OLD.color THEN RAISE EXCEPTION 'Somente Admin pode alterar o estilo dos conectores.';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_mytosis_connector_layout BEFORE INSERT OR UPDATE ON public.mytosis_links FOR EACH ROW EXECUTE FUNCTION public.guard_mytosis_connector_layout();