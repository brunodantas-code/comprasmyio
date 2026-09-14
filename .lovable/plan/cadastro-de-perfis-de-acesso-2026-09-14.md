# Cadastro de Perfis de Acesso

## Objetivo
Criar **Cadastro > Diversos > Perfil de Acesso** para administrar os nomes disponíveis na lista de usuários. Cada perfil novo será baseado em **Admin**, **Padrão** ou **Restrito**, herdando exatamente as regras e proteções do modelo escolhido.

## O que será feito
- Adicionar o cadastro **Perfil de Acesso** em **Cadastro > Diversos**, no mesmo padrão dos demais cadastros:
  - botão `+` para criar;
  - nome do perfil;
  - modelo base: Admin, Padrão ou Restrito;
  - situação Ativo/Inativo;
  - edição e exclusão.
- Cadastrar inicialmente os três perfis atuais: **Admin**, **Padrão** e **Restrito**.
- Trocar a lista fixa da tela de usuários pela lista de perfis ativos cadastrados.
- Mostrar o nome cadastrado do perfil no cabeçalho e nas telas administrativas.
- Ao atribuir um perfil:
  - modelo **Admin** mantém acesso total, limite máximo de dois Admins e demais proteções atuais;
  - modelo **Padrão** mantém o acesso operacional atual;
  - modelo **Restrito** continua usando as permissões individuais de menus e submenus.
- Impedir exclusão de perfil vinculado a usuários. O usuário deverá realocar os vínculos antes da exclusão.
- Impedir exclusão dos três perfis originais; eles poderão ser renomeados ou desativados somente quando isso não bloquear usuários vinculados.

## Detalhes técnicos
- Criar uma tabela de definições de perfil com código, nome, modelo base, ativo e indicador de perfil original.
- Alterar o vínculo do usuário para apontar ao cadastro, preservando todos os vínculos existentes.
- Atualizar as funções e proteções administrativas para avaliar o **modelo base**, não o nome do perfil.
- Preservar a tabela separada de cargos e as permissões individuais dos usuários Restritos.
- Aplicar controle de acesso para que somente administradores possam alterar esse cadastro.
- Atualizar os tipos da aplicação e todas as consultas que hoje esperam apenas os três valores fixos.

## Validação
- Criar um perfil baseado em cada modelo e confirmar sua presença no dropdown.
- Atribuir e trocar perfis sem alterar as regras herdadas.
- Confirmar o limite de dois Admins.
- Confirmar que perfis Restritos continuam obedecendo às permissões individuais.
- Validar computador e celular, sem rolagem lateral ou campos cortados.
