# Exclusão e realocação de perfis de acesso

## Objetivo
Permitir que o Admin edite e exclua qualquer perfil. Quando houver usuários vinculados, a exclusão exigirá a escolha de outro perfil e fará a realocação antes de remover o perfil antigo.

## Implementação
- Exibir a ação de exclusão em todos os perfis, inclusive os atualmente protegidos.
- No diálogo de exclusão, contar todos os usuários vinculados e exigir um perfil de destino ativo quando houver vínculos.
- Executar realocação e exclusão em uma única operação: atualizar o perfil dos usuários, ajustar o papel Admin quando necessário, limpar personalizações individuais antigas e remover o perfil de origem.
- Remover a restrição que impede apagar perfis originais, mantendo validações de acesso exclusivo ao Admin.
- Atualizar imediatamente as listas de perfis, usuários e permissões após a operação.

## Validação
- Testar exclusão sem usuários vinculados.
- Testar exclusão com usuários, bloqueio sem destino e realocação bem-sucedida.
- Confirmar visualmente em desktop e celular e mostrar a prévia antes de declarar conclusão.
