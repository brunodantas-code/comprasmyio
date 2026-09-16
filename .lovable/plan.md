# Padronização dos botões de status

## Objetivo
Aplicar fundo verde-claro e texto preto a todos os indicadores de situação dos aplicativos, sem alterar filtros, botões de ação, alertas ou etiquetas informativas.

## Alterações
- Criar um estilo semântico único para status, com fundo verde-claro, borda verde e texto preto, incluindo tema escuro.
- Aplicar esse padrão nas situações de Supply, Approvals, Estoques, Cash Flow e Code.
- Preservar o texto de cada situação e seu comportamento atual; somente a apresentação visual será alterada.
- Validar a tela atual e as principais listagens em computador e celular.

## Detalhes técnicos
- Adicionar tokens de cor e uma variante `status` ao componente compartilhado de etiquetas.
- Substituir classes específicas amarelas, vermelhas, azuis, lilases e cinzas apenas nos elementos que representam status.
- Manter cores próprias de alertas como urgência, orçamento excedido, reposição e disponibilidade, pois não são botões de status.
