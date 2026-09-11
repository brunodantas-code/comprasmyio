# Exclusão de usuários com dupla aprovação

## Objetivo
Permitir que um usuário com perfil Admin solicite a exclusão de outro usuário, exigindo a aprovação de um segundo Admin antes da remoção definitiva. Limitar o sistema a no máximo dois usuários com perfil Admin.

## Implementação
1. Criar uma fila de exclusões de usuários com estados **Pendente**, **Aprovada** e **Rejeitada**, registrando usuário alvo, Admin solicitante, Admin decisor e datas.
2. Adicionar na tela **Usuários e logs** a ação de exclusão. A confirmação criará uma solicitação pendente, sem excluir o usuário imediatamente.
3. Exibir as solicitações pendentes aos Admins, permitindo ao outro Admin **Aprovar** ou **Rejeitar**. O solicitante não poderá decidir a própria solicitação.
4. Ao aprovar, excluir a conta de acesso do usuário no backend. Os registros históricos permanecerão preservados pelas referências existentes e pelas regras atuais do banco.
5. Impedir solicitações duplicadas para o mesmo usuário e impedir que um Admin solicite a própria exclusão.
6. Aplicar o limite de dois Admins no banco e no fluxo da tela. Ao tentar atribuir Admin a um terceiro usuário, mostrar uma mensagem clara de que o limite foi atingido.
7. Atualizar automaticamente as listas de usuários, perfis e solicitações de exclusão após cada ação.

## Segurança
- Todas as ações serão validadas no servidor com a sessão real do usuário.
- Somente perfis Admin poderão solicitar, aprovar ou rejeitar exclusões.
- A aprovação exigirá um Admin diferente do solicitante.
- O limite de dois Admins será garantido no banco, não apenas visualmente.
- A exclusão definitiva usará acesso privilegiado somente após todas as validações.

## Validação
- Confirmar que o primeiro Admin apenas cria uma pendência.
- Confirmar que o mesmo Admin não consegue aprovar sua solicitação.
- Confirmar que o segundo Admin pode aprovar ou rejeitar.
- Confirmar que a aprovação remove o acesso do usuário e atualiza a tela.
- Confirmar que um terceiro Admin não pode ser atribuído e recebe mensagem de erro.
