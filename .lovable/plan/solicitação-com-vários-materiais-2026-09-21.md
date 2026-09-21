# Solicitação com vários materiais

## Objetivo
Permitir que uma solicitação de Materiais contenha quantos itens forem necessários, todos reunidos em um único Approval e compartilhando alocação, destinatário, ponto de entrega, prazo, observações e anexos.

## Alterações na tela
- Substituir os filtros internos da lista por categorias com caixas de seleção exibidas antes dos blocos.
- Filtrar a lista de materiais de cada bloco conforme as categorias marcadas.
- Criar um bloco repetível com material e quantidade, incluindo botão `+` para adicionar e lixeira para remover.
- Impedir itens repetidos e exigir ao menos um material válido.
- Manter os campos compartilhados fora dos blocos.
- Preservar a opção de produto novo somente para Admin e Supply, em um fluxo separado do conjunto de itens cadastrados.

## Approval e dados
- Criar uma estrutura de itens vinculada à solicitação principal: uma solicitação gera um número de Approval e uma cadeia de aprovação.
- Salvar cada material e sua quantidade como item do mesmo Approval.
- Calcular o valor total do Approval pela soma dos itens quando o perfil puder informar valores.
- Manter compatibilidade com solicitações antigas, que possuem um único material.
- Aplicar controle de acesso para que cada usuário veja e altere os itens somente pelos mesmos critérios da solicitação principal.

## Estoque e acompanhamento
- Verificar a disponibilidade de cada material separadamente.
- Manter todos os itens identificados pelo mesmo Approval durante compra, expedição e acompanhamento.
- Exibir a relação completa de materiais nas listas, detalhes e telas de aprovação.

## Validação
- Testar inclusão, remoção, filtro por categoria, quantidade e bloqueio de duplicidade.
- Testar o envio com vários materiais e confirmar um único Approval.
- Conferir visualização para solicitante, aprovador e Supply em computador e celular.
