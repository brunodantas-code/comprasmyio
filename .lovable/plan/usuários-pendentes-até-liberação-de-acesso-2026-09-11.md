# Usuários pendentes até liberação de acesso

## Objetivo
Mostrar ao Admin os novos usuários na tela **Usuários**, em uma seção **Usuários pendentes**, sem misturá-los à lista de usuários ativos enquanto nenhum menu tiver sido liberado.

## Implementação
1. Identificar como pendente todo usuário com Perfil Restrito que ainda não tenha ao menos um menu permitido.
2. Exibir esses cadastros em **Usuários pendentes**, usando o mesmo padrão visual e organização de **Exclusões pendentes**, com nome e e-mail.
3. Remover os usuários pendentes da listagem principal e dos agrupamentos/filtros de usuários ativos.
4. Assim que o Admin liberar pelo menos um menu em **Perfis de Acesso**, atualizar automaticamente a tela: o cadastro sai de **Usuários pendentes** e passa a aparecer na lista principal.
5. Se todas as permissões forem removidas posteriormente, o usuário volta para **Usuários pendentes** e deixa novamente a lista principal.

## Regras preservadas
- Novos usuários continuam sendo criados com Perfil Restrito e sem cargo automático.
- A seção de exclusões pendentes e o fluxo de dupla aprovação permanecem inalterados.
- Nenhuma alteração será feita em usuários já ativos que tenham pelo menos um menu permitido ou perfil Admin/Padrão.

## Validação
- Confirmar que um usuário Restrito sem menus aparece somente em **Usuários pendentes**.
- Liberar um menu e confirmar que ele migra para a lista principal.
- Remover todas as permissões e confirmar que ele retorna à seção pendente.
- Verificar a organização em computador e celular, sem rolagem lateral.
