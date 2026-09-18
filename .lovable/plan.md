# Cadastro de Funções Operacionais

## O que será entregue
- Manter **Cargo** como referência exclusiva para organograma e alçadas.
- Acrescentar, em **Cadastro > Cargos**, uma área para criar, editar e desativar **Funções Operacionais**.
- Manter **Time de Supply** como a primeira função cadastrada.
- Fazer o campo **Função Operacional Adicional**, em Usuários, listar automaticamente todas as funções ativas cadastradas.
- Permitir uma função operacional adicional por usuário, além da opção **Nenhuma**.

## Regras
- A função operacional não altera o cargo principal, as alçadas nem a cadeia de aprovação.
- **Time de Supply** continuará liberando a Fila do Supply, seus alertas e as ações operacionais de compra.
- Novas funções ficarão disponíveis para atribuição sem ganhar permissões automáticas específicas; essas integrações poderão ser definidas quando cada função for utilizada.
- Funções vinculadas a usuários serão desativadas, não removidas, preservando as atribuições existentes.

## Detalhes técnicos
- Criar um cadastro protegido de funções operacionais e um vínculo do usuário com sua função adicional.
- Migrar a atribuição atual de Alexandre e demais usuários marcados como Time de Supply para o novo vínculo, preservando o reconhecimento atual do Supply.
- Restringir criação, edição, desativação e atribuição a Admins.
- Atualizar a tela de Cargos e a lista de Usuários para usar o cadastro, sem lista fixa no código.

## Validação
- Cadastrar uma nova função e confirmar sua aparição no campo dos usuários.
- Atribuir, trocar e remover a função adicional de um usuário.
- Confirmar que Alexandre permanece com cargo financeiro e função Time de Supply.
- Confirmar que somente Time de Supply recebe fila e alertas do Supply.
