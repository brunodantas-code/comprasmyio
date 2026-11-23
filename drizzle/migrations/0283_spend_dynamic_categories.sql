DO $migration$
DECLARE definition text; old_rule text := 'IF cat NOT IN (''alimentacao'',''transporte'',''estacionamento'',''pedagio'',''ferramentas'',''insumos'',''servicos'',''ia'',''software'',''outros'') THEN RAISE EXCEPTION ''Categoria inválida''; END IF;'; new_rule text := $rule$
SELECT coalesce((SELECT variant_key::jsonb FROM public.cde_selected WHERE group_key='spend_categories' AND is_primary LIMIT 1),'{}'::jsonb) INTO cfg;
IF cat IS NULL OR (cat NOT IN ('alimentacao','transporte','estacionamento','pedagio','ferramentas','insumos','servicos','ia','software','outros') AND (cat !~ '^custom_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR NOT (cfg ? cat) OR trim(coalesce(cfg->cat->>'name',''))='')) OR coalesce(cfg->cat->>'active','true')='false' OR coalesce(cfg->cat->>'deleted','false')='true' THEN RAISE EXCEPTION 'Categoria indisponível'; END IF;
$rule$;
BEGIN
SELECT pg_get_functiondef('public.spend_action(text,jsonb)'::regprocedure) INTO definition;
IF strpos(definition,old_rule)=0 THEN RAISE EXCEPTION 'Regra original não localizada'; END IF;
EXECUTE replace(definition,old_rule,new_rule);
END $migration$;