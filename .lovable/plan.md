## Objetivo
Adicionar “Pagamento” às Novas Solicitações, usando um formulário único inspirado em Reembolsos.

## Interface
- Incluir “Pagamento” na lista de tipos de solicitação.
- Exibir um único conjunto de campos: descrição, valor e data, sem botão para adicionar novos pagamentos.
- Remover a escolha por checkbox entre Projeto e Cliente para esse tipo.
- Exibir Centro de Custo, Projeto e Cliente como listas independentes.
- Marcar Centro de Custo como obrigatório; Projeto e Cliente serão opcionais, com opções explícitas de não seleção.

## Salvamento e validação
- Gravar o tipo como `pagamento`, com quantidade 1, valor total informado e detalhes do pagamento no histórico estruturado já usado por Reembolsos.
- Salvar simultaneamente Projeto e Cliente quando informados.
- Impedir o envio sem Centro de Custo, descrição, valor válido ou data.
- Manter o fluxo hierárquico de aprovação existente.

## Exibição
- Mostrar “Pagamento” como Tipo nas listas, approvals pendentes, solicitações em fluxo e relatório.
- Preservar o comportamento atual de todos os demais tipos de solicitação.

## Verificação
- Conferir criação, campos opcionais e obrigatórios, exibição do tipo e ausência de rolagem lateral em telas menores.