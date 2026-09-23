ALTER TABLE public.user_menu_permissions
DROP CONSTRAINT user_menu_permissions_menu_key_check;

ALTER TABLE public.user_menu_permissions
ADD CONSTRAINT user_menu_permissions_menu_key_check CHECK (menu_key = ANY (ARRAY[
  'solicitacoes', 'solicitacoes_minhas', 'solicitacoes_novas',
  'solicitacoes_centro_custo', 'solicitacoes_item_novo',
  'solicitacoes_alocacao_projeto', 'solicitacoes_alocacao_cliente',
  'solicitacoes_alocacao_estoque', 'solicitacoes_alocacao_interna',
  'approvals', 'approvals_pendentes', 'approvals_meus', 'approvals_todos', 'approvals_consolidado',
  'armazem', 'armazem_fabrica', 'armazem_estoque_myio', 'armazem_expedicao', 'armazem_transporte',
  'armazem_cliente', 'armazem_tecnico', 'armazem_perdido', 'armazem_itens_avariados',
  'armazem_homologacao', 'armazem_checar_qr', 'armazem_almoxarifado', 'armazem_ferramentas_ativos',
  'cadastro', 'cadastro_projetos', 'cadastro_clientes', 'cadastro_centros', 'cadastro_cargos',
  'cadastro_lembretes', 'cadastro_diversos', 'usuarios', 'usuarios_lista', 'usuarios_acesso_restrito',
  'usuarios_workflow', 'usuarios_logs', 'usuarios_backup'
]::text[]));