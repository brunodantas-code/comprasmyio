INSERT INTO public.erp_apps (key, name, description, active, position)
VALUES ('rh', 'myio RH', 'Gestão de Pessoas', true, 5)
ON CONFLICT (key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    active = EXCLUDED.active,
    position = EXCLUDED.position;