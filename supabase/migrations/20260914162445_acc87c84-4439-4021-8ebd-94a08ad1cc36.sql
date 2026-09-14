INSERT INTO public.erp_apps (key, name, description, position)
VALUES
  ('crm', 'myio CRM', 'Gestão de relacionamento com clientes.', 3),
  ('legal', 'myio Legal', 'Gestão jurídica e acompanhamento de demandas.', 4)
ON CONFLICT (key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    position = EXCLUDED.position,
    active = true,
    updated_at = now();