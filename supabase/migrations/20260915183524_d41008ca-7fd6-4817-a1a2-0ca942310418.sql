DELETE FROM public.access_profile_request_types AS tipos
WHERE NOT EXISTS (
  SELECT 1
  FROM public.access_profile_permissions AS permissoes
  WHERE permissoes.profile_code = tipos.profile_code
    AND permissoes.menu_key = 'solicitacoes_novas'
    AND permissoes.allowed = true
);

DELETE FROM public.user_request_type_permissions AS tipos
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_menu_permissions AS permissoes
  WHERE permissoes.user_id = tipos.user_id
    AND permissoes.menu_key = 'solicitacoes_novas'
    AND permissoes.allowed = true
);