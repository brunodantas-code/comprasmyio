# Dispositivos myio com Approval por quantidade

## O que será entregue
- Recolocar **Dispositivos myio** na lista de **Tipo de solicitação**. Ao selecionar, abrir a mesma tela específica que já existe, sem transformá-la no formulário comum.
- Manter o botão **+** do bloco **Solicitações de Dispositivos myio** abrindo essa mesma tela.
- Na tela específica, permitir selecionar **Projeto**, **Cliente** ou ambos, de forma independente.
- Quando houver Cliente, exigir uma única classificação: **Manutenção**, **Reposição por mal uso** ou **Upsell**.
- Exibir, em **Minhas Solicitações**, somente as solicitações de Dispositivos myio feitas pelo usuário conectado.
- Criar um número de Approval para cada solicitação e enviá-la ao fluxo normal de **Approvals**.
- Usar a soma das quantidades dos dispositivos para determinar a alçada, em faixas separadas das alçadas financeiras.
- Liberar produção, edição operacional e mudança de status somente após a aprovação final.

## Tela e acompanhamento
- Preservar a lista atual de produtos, fotos, quantidades, data de entrega, observações e indicação de reposição.
- Acrescentar Cliente, classificação do atendimento, número do Approval e status da aprovação ao acompanhamento.
- Em Approvals, mostrar **quantidade** para Dispositivos myio, sem apresentar R$ 0,00 como valor da solicitação.
- Manter os registros preparados para relatórios futuros de manutenção, upsell e reposição por mau uso por cliente.

## Detalhes técnicos
- Vincular o pedido operacional de Dispositivos myio ao registro canônico de Approval.
- Validar formulário e gravação no servidor, incluindo produtos cadastrados, limites de quantidade e classificação obrigatória para Cliente.
- Aplicar regras de acesso para o solicitante ver apenas seus pedidos e para os perfis operacionais autorizados gerenciarem pedidos já aprovados.
- Adicionar três alçadas de quantidade por usuário: automática, faixa 2 e faixa 3.
- Preservar os pedidos existentes sem Approval e o fluxo antigo de separação de estoque.

## Validação
- Testar criação por Projeto, por Cliente e por ambos.
- Testar obrigatoriedade da classificação quando Cliente estiver selecionado.
- Testar visibilidade somente do próprio usuário e bloqueio operacional antes da aprovação.
- Conferir Approvals, computador e celular, além da integridade e segurança dos dados.
