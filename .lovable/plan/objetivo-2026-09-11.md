## Objetivo
Adicionar “Pagamento” às Novas Solicitações, usando um formulário único inspirado em Reembolsos.

## Interface
- Incluir “Pagamento” na lista de tipos de solicitação.
- Exibir um único conjunto de campos: descrição, valor e data, sem botão para adicionar novos pagamentos.
- Remover a escolha por checkbox entre Projeto e Cliente para esse tipo.
- Exibir Centro de Custo, Projeto e Cliente como listas independentes.
- Marcar Centro de Custo como obrigatório; Projeto e Cliente serão opcionais, com opções explícitas de não seleção.
- Permitir selecionar opcionalmente um Approval já aprovado; solicitações pendentes, rejeitadas ou canceladas não aparecerão nessa lista.

## Salvamento e validação
- Gravar o tipo como `pagamento`, com quantidade 1, valor total informado e detalhes do pagamento no histórico estruturado já usado por Reembolsos.
- Salvar simultaneamente Projeto e Cliente quando informados.
- Impedir o envio sem Centro de Custo, descrição, valor válido ou data.
- Quando houver vínculo, manter o mesmo número do Approval e reunir o histórico original e o do pagamento, preservando separadamente as datas de criação.
- Um Approval vinculado acumulará o tipo original e “Pagamento” no relatório e nas listas.
- Criar “Financeiro” como cargo de aprovação: pagamentos criados por esse cargo seguem diretamente ao CFO; pagamentos dos demais cargos seguem ao Financeiro.
- Pagamentos sem vínculo também seguirão essa regra de aprovação.

## Exibição
- Mostrar “Pagamento” como Tipo nas listas, approvals pendentes, solicitações em fluxo e relatório.
- Em solicitações vinculadas, mostrar o tipo original junto de “Pagamento”.
- Preservar o comportamento atual de todos os demais tipos de solicitação.

## Dados e segurança
- Manter o Approval original intacto e registrar o pagamento como etapa vinculada, evitando duplicar ou sobrescrever seu histórico.
- Aplicar permissões de acesso equivalentes às solicitações existentes e registrar a criação do pagamento no histórico compartilhado.
- Atualizar o cadastro de acessos e a hierarquia para reconhecer o cargo Financeiro.

## Verificação
- Conferir criação com e sem vínculo, seleção apenas de Approvals aprovados, roteamento Financeiro/CFO, histórico, campos obrigatórios e telas menores.