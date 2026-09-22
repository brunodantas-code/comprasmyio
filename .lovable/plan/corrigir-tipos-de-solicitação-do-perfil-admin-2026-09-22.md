# Corrigir tipos de solicitação do perfil Admin

## Objetivo
Fazer a tela de customização mostrar todos os tipos de solicitação ativos selecionados para usuários vinculados ao perfil Admin, igual ao cadastro do perfil e ao acesso efetivo do sistema.

## Alteração
- Na lista de usuários, tratar o perfil Admin como acesso total também para os tipos de solicitação, assim como já ocorre com menus e submenus.
- Manter os controles bloqueados para Admin, preservando as proteções atuais.
- Não criar permissões individuais desnecessárias: a seleção continuará sendo herdada do perfil Admin.

## Validação
- Confirmar Bruno e João Paulo com todos os tipos ativos marcados.
- Confirmar que perfis não Admin continuam exibindo apenas seus tipos cadastrados ou customizados.
- Validar em computador e celular.
