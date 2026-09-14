# Consolidação de approvals pendentes por cargo

## Recomendação
Criar uma aba própria **Consolidado por Cargo** dentro de **Approvals**, ao lado de **Todos**. Essa organização mantém **Todos** como consulta detalhada de cada solicitação e oferece acesso direto ao resumo gerencial, sem depender de ativar um agrupamento.

## O que será criado
- Adicionar a aba **Consolidado por Cargo**, disponível para os mesmos usuários que acessam **Todos**.
- Considerar somente a etapa pendente atualmente liberada de cada approval, evitando contar etapas futuras do mesmo fluxo.
- Agrupar os approvals pelo cargo responsável pela etapa atual.
- Exibir em cada cargo:
  - quantidade total de approvals pendentes;
  - valor total pendente;
  - participação do cargo no total geral.
- Exibir no topo os totais gerais de quantidade e valor.
- Permitir abrir cada grupo para visualizar os approvals que compõem o total, mantendo o número como acesso ao pop-up de detalhes já existente.
- Adaptar a apresentação para celular sem rolagem lateral.

## Regras de consolidação
- Cada approval será contado uma única vez, no cargo da sua etapa pendente atual.
- Etapas posteriores ainda bloqueadas não entram na consolidação.
- Quando houver responsável individual, o agrupamento continuará usando o cargo desse responsável.
- Etapas sem cargo identificável serão agrupadas em **Sem cargo definido**, para não ocultar valores pendentes.

## Validação
- Conferir se a soma dos grupos corresponde aos totais gerais.
- Validar que um approval com várias etapas pendentes aparece apenas no primeiro cargo da sequência.
- Conferir a visualização em computador e celular.
