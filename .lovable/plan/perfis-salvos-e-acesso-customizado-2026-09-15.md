# Perfis salvos e acesso customizado

## Objetivo

Permitir que o Admin escolha entre atribuir um perfil pré-cadastrado ao usuário ou configurar manualmente seus menus e submenus pela opção **Customizado**.

## O que será alterado

### Cadastro de perfis
- O formulário de novo perfil exibirá nome, situação e a estrutura completa de menus e submenus do myio supply.
- O Admin poderá marcar cada acesso; marcar um submenu também habilitará seu menu principal.
- Perfis salvos poderão ser editados e reutilizados na lista de usuários.
- Os perfis originais serão preservados: Admin continuará com acesso total, Padrão receberá os acessos operacionais atuais e Restrito manterá a configuração mínima atual.

### Atribuição aos usuários
- A lista **Perfil de acesso** exibirá todos os perfis ativos e a opção **Customizado**.
- Ao escolher um perfil salvo, o usuário passará a usar exatamente os menus e submenus definidos nesse perfil.
- Ao escolher **Customizado**, aparecerá a estrutura completa de menus e submenus naquele usuário para configuração individual.
- Alterar de Customizado para um perfil salvo manterá as escolhas individuais armazenadas, mas elas só voltarão a valer quando Customizado for selecionado novamente.

### Regras e compatibilidade
- O perfil Admin continuará limitado a dois usuários e com acesso total.
- A autorização administrativa continuará validada com segurança, independentemente do que estiver visível na tela.
- Usuários atuais serão migrados sem perder acesso: Padrão recebe sua estrutura operacional atual; Restrito conserva as permissões individuais já configuradas.
- A tela **Perfis de acesso** será reorganizada para mostrar primeiro os perfis cadastrados e depois apenas os usuários em modo Customizado.

## Detalhes técnicos
- Criar uma tabela de permissões por perfil, separada das permissões individuais por usuário, com RLS e concessões adequadas.
- Registrar **Customizado** como opção de atribuição sem tratá-lo como perfil reutilizável editável.
- Atualizar a leitura de acesso para resolver permissões do perfil salvo ou do usuário, conforme o modo selecionado.
- Atualizar criação, edição, exclusão/realocação e atribuição de perfis para preservar as proteções existentes.
- Validar no computador e celular, incluindo perfis salvos, Customizado, limite de Admin e ausência de rolagem lateral.