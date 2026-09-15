ALTER TABLE public.user_menu_permissions
DROP CONSTRAINT user_menu_permissions_menu_key_check;

ALTER TABLE public.user_menu_permissions
ADD CONSTRAINT user_menu_permissions_menu_key_check CHECK (menu_key = ANY (ARRAY[
  'solicitacoes', 'solicitacoes_minhas', 'solicitacoes_novas',
  'approvals', 'approvals_pendentes', 'approvals_meus', 'approvals_todos', 'approvals_consolidado',
  'armazem', 'armazem_fabrica', 'armazem_estoque_myio', 'armazem_expedicao', 'armazem_transporte',
  'armazem_cliente', 'armazem_tecnico', 'armazem_perdido', 'armazem_itens_avariados',
  'armazem_homologacao', 'armazem_checar_qr', 'armazem_almoxarifado', 'armazem_ferramentas_ativos',
  'cadastro', 'cadastro_projetos', 'cadastro_clientes', 'cadastro_centros', 'cadastro_cargos',
  'cadastro_lembretes', 'cadastro_diversos', 'usuarios', 'usuarios_lista', 'usuarios_acesso_restrito',
  'usuarios_workflow', 'usuarios_logs', 'usuarios_backup'
]::text[]));

INSERT INTO public.access_profile_permissions (profile_code, menu_key, allowed)
SELECT existing.profile_code, child.menu_key, true
FROM public.access_profile_permissions AS existing
CROSS JOIN unnest(ARRAY[
  'armazem_fabrica',
  'armazem_estoque_myio',
  'armazem_expedicao',
  'armazem_transporte',
  'armazem_cliente',
  'armazem_tecnico',
  'armazem_perdido',
  'armazem_itens_avariados',
  'armazem_homologacao',
  'armazem_checar_qr',
  'armazem_almoxarifado',
  'armazem_ferramentas_ativos'
]::text[]) AS child(menu_key)
WHERE existing.menu_key = 'armazem'
  AND existing.allowed = true
ON CONFLICT (profile_code, menu_key)
DO UPDATE SET allowed = EXCLUDED.allowed;

INSERT INTO public.user_menu_permissions (user_id, menu_key, allowed)
SELECT existing.user_id, child.menu_key, true
FROM public.user_menu_permissions AS existing
CROSS JOIN unnest(ARRAY[
  'armazem_fabrica',
  'armazem_estoque_myio',
  'armazem_expedicao',
  'armazem_transporte',
  'armazem_cliente',
  'armazem_tecnico',
  'armazem_perdido',
  'armazem_itens_avariados',
  'armazem_homologacao',
  'armazem_checar_qr',
  'armazem_almoxarifado',
  'armazem_ferramentas_ativos'
]::text[]) AS child(menu_key)
WHERE existing.menu_key = 'armazem'
  AND existing.allowed = true
ON CONFLICT (user_id, menu_key)
DO UPDATE SET allowed = EXCLUDED.allowed;