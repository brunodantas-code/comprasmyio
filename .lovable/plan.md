# Consolidação de itens no Supply

## Objetivo
Permitir ao setor de Compras reunir demandas do mesmo item, enxergar o volume total e negociar preços, preservando cada solicitação original.

## Onde ficará
Em **Supply → Approvals**, acrescentar **Consolidar itens** ao lado de **Agrupar por Projeto e Cliente**, conforme a tela enviada. Disponível também na **Fila do Supply**, respeitando o acesso atual de cada usuário.

O botão abre uma consulta com duas opções lado a lado:
- **Por Item:** quantidade total do item, seguida dos solicitantes e suas respectivas demandas.
- **Por Solicitante:** cada solicitante com os itens e as quantidades solicitadas.

## Quais demandas entram
- Inicialmente, somente solicitações de compra **aprovadas e ainda não compradas**: esse é o volume efetivamente disponível para cotação.
- Pedidos em aprovação poderão ser consultados com um filtro separado, identificados como **não liberados para compra**, sem somar ao volume aprovado.
- Excluir pagamentos, serviços, viagens e solicitações canceladas, rejeitadas ou já compradas/recebidas dos totais de cotação.
- Manter compras **Nacionais e Importadas** separadas, assim como as origens dos estoques **Fábrica/Almoxarifado/Terceiros/Ferramentas**, quando aplicáveis.

## Exibição por Item
Cada item terá uma linha com:
- Nome/código e unidade do cadastro, quando disponível.
- Quantidade total para cotação.
- Quantidade de solicitações e solicitantes distintos.
- Valor total estimado, sem tratar a estimativa como preço negociado.
- Seta para exibir/recolher as demandas que compõem o total.

Ao expandir, mostrar: número da solicitação, solicitante, quantidade, valor unitário estimado, subtotal, projeto/cliente ou destino interno/estoque, data e situação.

**Exemplo ilustrativo:** Ana solicita 10 unidades e Bruno 15 do mesmo item: Compras vê **25 unidades**, com as duas solicitações preservadas abaixo.

## Filtros e PDF
- Busca por item e filtros de data, solicitante, projeto/cliente, origem e situação.
- Seta para exibir/recolher todos os grupos.
- Ícone de PDF com exportação **Resumida** (totais por item) ou **Detalhada** (totais e solicitações de origem).
- PDF usa os mesmos filtros, agrupamento e ordenação da consulta; inclui data de emissão e filtros utilizados.

## O que não muda
A consolidação é uma visão para cotação: não une pedidos, não altera aprovações, não movimenta estoques e não redistribui valores. Cada demanda mantém seu solicitante, projeto/cliente, destino e histórico.

## Detalhes técnicos
- Agrupar pela identidade do item cadastrado e sua origem, nunca apenas por nomes semelhantes; registros antigos sem vínculo ficam separados para conferência.
- Ler todos os itens das solicitações e os vínculos de catálogo; evitar duplicar pedidos com etapas de aprovação paralelas e evitar contar simultaneamente o resumo do pedido e suas linhas.
- Usar unidade do catálogo sem inferi-la pelo nome. Valores ou unidades ausentes ficam identificados como não informados.
- Compartilhar a função de consolidação entre tela e PDF e testar soma de quantidades, separação de origens, elegibilidade e ausência de duplicações.

## Aprovação
Esta é somente a proposta. A implementação do Supply começa após sua aprovação.