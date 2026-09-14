# Desenvolver o myio cash flow

## Resultado
- Substituir a tela “Em breve” por um aplicativo financeiro com três áreas: **Contas a pagar**, **Plano de Contas** e **Caixa**.
- Enviar automaticamente ao Cash Flow todo Approval que alcançar a aprovação final, sem mover nem alterar seu histórico no myio supply.
- Permitir que o Financeiro classifique cada pagamento em uma conta do Plano de Contas antes de seguir com o pagamento.
- Importar extratos bancários em OFX e CSV, evitar duplicidades e calcular o saldo disponível.

## Fluxo dos Approvals
- Criar automaticamente uma conta a pagar quando o Approval mudar definitivamente para aprovado, cobrindo tanto a aprovação pela última pessoa quanto aprovações automáticas por alçada.
- Manter o Approval, suas etapas e seus logs integralmente no Supply; o Cash Flow guardará uma referência ao registro original e seu próprio histórico financeiro.
- Garantir idempotência: o mesmo Approval nunca poderá gerar duas contas a pagar.
- Trazer também os Approvals já aprovados para a fila inicial, sem duplicá-los.
- Exibir número do Approval, tipo, descrição, solicitante, projeto ou cliente, centro de custo, valor, data e situação financeira.

## Plano de Contas e orçamento
- Criar uma estrutura hierárquica de **grupos e subcontas**, com código, nome, natureza e situação ativa/inativa.
- Permitir lançamentos somente nas contas finais da hierarquia.
- Criar uma visão por exercício, abrindo no ano atual e permitindo selecionar outros anos.
- Registrar orçamento mensal de janeiro a dezembro para cada conta, com totais anual, realizado e saldo.
- Impedir exclusão de contas com subcontas, orçamentos, pagamentos ou movimentações vinculadas.

## Contas a pagar
- Receber todo Approval concluído inicialmente como **A classificar**.
- Exigir uma conta final do Plano de Contas antes de o pagamento avançar.
- Preservar projeto ou cliente e centro de custo vindos do Supply.
- Controlar os estados financeiros separadamente do Approval: A classificar, A pagar, Pago, Parcialmente conciliado, Conciliado e Cancelado.
- Permitir consultar o histórico do Approval original sem duplicar ou apagar o histórico do Supply.

## Caixa
- Cadastrar as contas bancárias com saldo inicial e data de referência.
- Importar arquivos **OFX e CSV**; no CSV, permitir relacionar as colunas de data, descrição e valor.
- Mostrar uma prévia antes da confirmação da importação.
- Identificar o arquivo e cada movimentação para impedir duplicidades em reimportações.
- Listar entradas e saídas, filtros por conta/período, totais e saldo disponível calculado pelo saldo inicial mais as movimentações.
- Permitir conciliar uma movimentação bancária com um ou mais pagamentos, inclusive pagamentos parciais.

## Acesso e segurança
- Manter o acesso geral pelo aplicativo **myio cash flow** no portal, separado das permissões internas do myio supply.
- Restringir dados financeiros e alterações a usuários com acesso ao Cash Flow e função financeira ou administrativa.
- Aplicar proteção por usuário no banco, trilha de criação/importação/conciliação e validações contra ciclos e valores inválidos.

## Interface
- Manter a identidade visual atual da plataforma myio e o retorno para “Meus Aplicativos”.
- Criar navegação clara entre Contas a pagar, Plano de Contas e Caixa.
- Adaptar tabelas, árvore do plano, orçamento mensal e importação para computador e celular sem rolagem lateral incoerente.

## Detalhes técnicos
- Novas estruturas para plano de contas, orçamento mensal, contas a pagar, contas bancárias, lotes de importação, movimentações e conciliações.
- Um gatilho após a aprovação final criará a conta a pagar com chave única do Approval; a carga inicial usará a mesma regra idempotente.
- OFX será interpretado diretamente; CSV terá mapeamento de colunas. Arquivos não serão usados como fonte do saldo após a importação — as movimentações validadas serão a fonte.
- O saldo será calculado, não armazenado separadamente, evitando divergências.

## Validação
- Aprovar um Approval pela última etapa e por alçada automática, confirmando uma única entrada no Cash Flow.
- Confirmar que o histórico completo continua disponível no Supply.
- Testar classificação contábil obrigatória e orçamento para diferentes exercícios.
- Importar e reimportar OFX/CSV, validando prévia, deduplicação, entradas, saídas e saldo.
- Testar conciliação total e parcial e verificar os estados financeiros.
- Validar permissões, computador e celular.
