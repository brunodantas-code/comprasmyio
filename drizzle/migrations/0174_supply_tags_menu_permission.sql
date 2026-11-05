ALTER TABLE public.user_menu_permissions DROP CONSTRAINT user_menu_permissions_menu_key_check;
ALTER TABLE public.user_menu_permissions ADD CONSTRAINT user_menu_permissions_menu_key_check CHECK (menu_key = ANY (ARRAY['solicitacoes','solicitacoes_minhas','solicitacoes_novas','solicitacoes_centro_custo','solicitacoes_item_novo','solicitacoes_alocacao_projeto','solicitacoes_alocacao_cliente','solicitacoes_alocacao_estoque','solicitacoes_alocacao_interna','approvals','approvals_pendentes','approvals_meus','approvals_todos','approvals_consolidado','armazem','armazem_fabrica','armazem_estoque_myio','armazem_expedicao','armazem_transporte','armazem_cliente','armazem_tecnico','armazem_perdido','armazem_itens_avariados','armazem_homologacao','armazem_checar_qr','armazem_almoxarifado','armazem_ferramentas_ativos','cadastro','cadastro_projetos','cadastro_clientes','cadastro_centros','cadastro_etiquetas','cadastro_cargos','cadastro_lembretes','cadastro_diversos','usuarios','usuarios_lista','usuarios_acesso_restrito','usuarios_workflow','usuarios_logs','usuarios_backup']::text[]));
INSERT INTO public.user_menu_permissions (user_id, menu_key, allowed)
SELECT DISTINCT p.user_id, 'cadastro_etiquetas', true FROM public.user_menu_permissions p
WHERE p.menu_key = 'cadastro_centros' AND p.allowed
  AND (public.has_role(p.user_id,'financeiro') OR public.has_role(p.user_id,'comprador') OR public.has_role(p.user_id,'admin') OR public.is_supply_member(p.user_id))
  AND NOT EXISTS (SELECT 1 FROM public.user_menu_permissions x WHERE x.user_id = p.user_id AND x.menu_key = 'cadastro_etiquetas');
INSERT INTO public.access_profile_permissions (profile_code, menu_key, allowed)
SELECT profile_code, 'cadastro_etiquetas', true FROM public.access_profile_permissions p
WHERE menu_key = 'cadastro_centros' AND allowed
  AND NOT EXISTS (SELECT 1 FROM public.access_profile_permissions x WHERE x.profile_code = p.profile_code AND x.menu_key = 'cadastro_etiquetas');