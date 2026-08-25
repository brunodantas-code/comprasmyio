---
name: Estoque Ferramentas/Ativos
description: Sub-aba Ferramentas/Ativos ao lado de Almoxarifado, com banco próprio (tool_assets/tool_movements) e baixa com destino obrigatório
type: feature
---
- Ferramentas/Ativos é uma área de estoque independente (tabelas `tool_assets` e `tool_movements`), nunca misturada com Fábrica, Almoxarifado ou Myio Terceiros.
- Cadastro tem as mesmas configurações dos demais: foto, link de referência, quantidade por lote, tipo de compra (nacional/importação) e observações.
- Toda baixa (saída) exige um **destino**: técnico ou local. Saldo nunca fica negativo.
- Itens de Ferramentas/Ativos aparecem no seletor de nova solicitação de compra (`purchase_orders.tool_asset_id`) e entram automaticamente nesse estoque quando o pedido é marcado como recebido corretamente.
- Na fila de compras, o `purchase_type` da ferramenta define se cai em Nacional ou Importação.
