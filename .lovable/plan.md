# Separar Perfis de Acesso e Cargos

## Objetivo
Separar claramente duas informações de cada usuário:
- **Cargo:** define sua posição na cadeia de aprovação.
- **Perfil:** define quais áreas do sistema ele pode acessar.

## Implementação
1. Criar os perfis fixos **Admin**, **Padrão** e **Restrito**.
2. Associar exatamente um perfil de acesso a cada usuário, mantendo o cargo em campo separado.
3. Aplicar estas regras:
   - **Admin:** acessa tudo e pode editar usuários e permissões.
   - **Padrão:** acessa todos os menus operacionais, sem Cadastro e sem Usuários e logs.
   - **Restrito:** acessa somente os menus selecionados individualmente pelo Admin.
4. Criar em **Cadastro** a nova área **Perfis de Acesso**, com seleção por checkboxes dos menus de cada usuário Restrito.
5. Reorganizar a tela de usuários para mostrar e editar separadamente **Cargo** e **Perfil**.
6. Manter o cargo como autoridade da cadeia de aprovação, inclusive Financeiro, CFO e demais níveis.
7. Proteger as configurações no banco para que somente Admin possa alterá-las; ocultar menus não autorizados na navegação.
8. Preservar usuários atuais com uma migração segura: administradores atuais recebem Admin; os demais recebem Padrão.

## Detalhes técnicos
- Adicionar tipo de perfil de acesso e campos/tabela de permissões por usuário no Lovable Cloud, com políticas de segurança.
- Não reutilizar `user_roles` para acesso: essa estrutura continuará representando somente cargos da aprovação.
- Centralizar a verificação dos menus permitidos para evitar regras diferentes entre telas.
- Validar os três perfis, a edição de cargo e o comportamento da navegação em desktop e celular.
