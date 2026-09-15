# Filtro por usuário e acesso administrativo exclusivo

## Objetivo

Facilitar a localização de usuários na customização e garantir que **Usuários e logs** pertença exclusivamente ao perfil Admin.

## Alterações

- Adicionar um campo de busca por nome na lista de usuários, com filtragem imediata e mensagem quando não houver resultados.
- Ocultar o grupo **Usuários e logs** dos seletores usados para criar/editar perfis não administrativos e customizar usuários.
- Manter o grupo visível, marcado e bloqueado para usuários vinculados ao perfil Admin.
- Impedir que permissões antigas ou manipuladas liberem **Usuários e logs** para perfis não Admin.
- Preservar os acessos administrativos existentes e validar a tela em computador e celular.

## Detalhes técnicos

- Permitir que o seletor receba grupos visíveis específicos, sem alterar a estrutura global dos menus.
- Aplicar a regra de Admin na resolução efetiva de permissões, além da apresentação da tela.
- Limpar permissões administrativas salvas em perfis e customizações não Admin para manter os dados coerentes.
