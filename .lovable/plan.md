# Permissões de submenus no Acesso Restrito

## Objetivo
Permitir que o Admin escolha, por usuário de perfil Restrito, não apenas os menus principais, mas também os submenus visíveis dentro de cada área.

## Alterações
- Organizar o painel **Acesso Restrito** por menu principal, exibindo abaixo as opções de cada submenu.
- Incluir controles separados para:
  - **Solicitações:** Minhas Solicitações e Novas Solicitações.
  - **Approvals:** Pendentes comigo, Meus em aprovação, Todos e Consolidado por Cargo.
  - **Cadastro:** Projetos, Clientes, Centro de Custo, Cargos, Lembretes e Diversos.
  - **Usuários e logs:** Usuários, Acesso Restrito, Approval Workflow, Logs e Backup.
- Manter **Armazém** como permissão de menu principal enquanto não houver submenus próprios nesse painel.
- Ocultar cada submenu não autorizado e abrir automaticamente o primeiro submenu permitido.
- Para usuários Restritos, manter **Todos** e **Consolidado por Cargo** ocultos até que o Admin os libere explicitamente; a regra de cargo da cadeia de aprovação continua obrigatória.
- Preservar o comportamento atual dos perfis Admin e Padrão.

## Compatibilidade
- Manter as permissões principais já configuradas.
- Para acessos Restritos existentes, preservar os submenus operacionais básicos do menu já liberado; os submenus gerenciais de Approvals começam desmarcados.

## Validação
- Confirmar que as opções aparecem agrupadas no Acesso Restrito.
- Testar usuário Restrito com combinações diferentes de submenus.
- Confirmar que abas não autorizadas não aparecem e que nunca é aberta uma aba oculta.
- Validar no computador e celular.

## Detalhes técnicos
- Ampliar as chaves aceitas em `user_menu_permissions` para menus e submenus.
- Centralizar a verificação no usuário atual, com suporte a permissões filhas.
- Aplicar os controles nos grupos de abas do painel e no centro de Approvals.
