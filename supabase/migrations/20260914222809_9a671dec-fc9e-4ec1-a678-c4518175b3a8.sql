ALTER TABLE public.user_menu_permissions
DROP CONSTRAINT IF EXISTS user_menu_permissions_menu_key_check;

ALTER TABLE public.user_menu_permissions
ADD CONSTRAINT user_menu_permissions_menu_key_check CHECK (
  menu_key IN (
    'solicitacoes',
    'solicitacoes_minhas',
    'solicitacoes_novas',
    'approvals',
    'approvals_pendentes',
    'approvals_meus',
    'approvals_todos',
    'approvals_consolidado',
    'armazem',
    'cadastro',
    'cadastro_projetos',
    'cadastro_clientes',
    'cadastro_centros',
    'cadastro_cargos',
    'cadastro_lembretes',
    'cadastro_diversos',
    'usuarios',
    'usuarios_lista',
    'usuarios_acesso_restrito',
    'usuarios_workflow',
    'usuarios_logs',
    'usuarios_backup'
  )
);

INSERT INTO public.user_menu_permissions (user_id, menu_key, allowed)
SELECT permission.user_id, child.menu_key, true
FROM public.user_menu_permissions AS permission
CROSS JOIN LATERAL (
  SELECT unnest(
    CASE permission.menu_key
      WHEN 'solicitacoes' THEN ARRAY['solicitacoes_minhas', 'solicitacoes_novas']::text[]
      WHEN 'approvals' THEN ARRAY['approvals_pendentes', 'approvals_meus']::text[]
      WHEN 'cadastro' THEN ARRAY['cadastro_projetos', 'cadastro_clientes', 'cadastro_centros', 'cadastro_cargos', 'cadastro_lembretes', 'cadastro_diversos']::text[]
      WHEN 'usuarios' THEN ARRAY['usuarios_lista', 'usuarios_acesso_restrito', 'usuarios_workflow', 'usuarios_logs', 'usuarios_backup']::text[]
      ELSE ARRAY[]::text[]
    END
  ) AS menu_key
) AS child
WHERE permission.allowed = true
ON CONFLICT (user_id, menu_key) DO NOTHING;