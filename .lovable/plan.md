# Função operacional adicional por usuário

## Objetivo
Permitir que um usuário acumule uma função operacional sem alterar seu cargo principal, perfil de acesso ou participação nas alçadas.

## Implementação
- Adicionar em **Usuários** o campo **Função operacional adicional**, ao lado de Cargo e Perfil de acesso.
- Disponibilizar inicialmente as opções **Nenhuma** e **Time de Supply**.
- Salvar a função separadamente do cargo principal, usando a estrutura de funções já existente.
- Restringir a atribuição e remoção da função a usuários Admin.
- Reconhecer **Time de Supply** tanto pelo cargo principal quanto pela função adicional, preservando o funcionamento atual do João de Deus.
- Fazer a função adicional liberar a Fila do Supply, seus alertas e as ações operacionais, sem incluir o usuário em novas etapas de aprovação.
- Exibir a função adicional no resumo do usuário para facilitar a conferência.

## Caso do Alexandre
- Manter **Analista Adm. Financeiro** como cargo principal.
- Atribuir **Time de Supply** como função operacional adicional.
- Preservar suas alçadas financeiras e habilitar suas pendências operacionais do Supply.

## Validação
- Confirmar que Alexandre passa a ver Fila do Supply e alertas correspondentes.
- Confirmar que suas alçadas continuam ligadas somente ao cargo Financeiro.
- Confirmar que João de Deus continua reconhecido como Supply pelo cargo atual.
- Confirmar que usuários sem a função não recebem alertas da Fila do Supply.
