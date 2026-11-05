# Etiquetas para Projetos internos no Supply

## Objetivo
Permitir consolidar o custo de iniciativas internas (feiras, desenvolvimento de tecnologia etc.) marcando cada solicitação Interna com Centro de Custo + Etiqueta.

## O que o usuário verá

**1. Cadastro → nova aba "Etiquetas"**
- Lista com: Nome, Descrição (opcional), Situação (ativa/inativa), Criada por e Data de criação.
- Botões no padrão: + Nova etiqueta, lápis verde para editar o nome, lixeira com confirmação.
- Busca tolerante por nome.
- Criar, editar e excluir: somente Admin, Financeiro e Compras. Os demais usuários com acesso ao Cadastro só visualizam.
- Etiqueta já usada em solicitações não é apagada: ela é inativada (sai da lista de seleção, mas continua nas solicitações antigas e nos relatórios).

**2. Nova Solicitação → alocação "Interna"**
- Além do Centro de Custo, aparece o campo **Etiqueta** (lista digitável, só etiquetas ativas).
- Etiqueta opcional (nem toda despesa interna pertence a uma iniciativa). Se preferir obrigatória, ajusto.
- Não aparece para Projeto, Cliente ou Estoque, mantendo a separação Implantação/Upsell x Sustentação.
- A etiqueta aparece no detalhe do approval, no Log e pode ser corrigida pelo Compras na edição já existente (registrada no Log).

**3. Consolidação de custo (base para o futuro)**
- Filtro "Etiqueta" nos Approvals, mostrando o total da etiqueta selecionada.
- Relatório/PDF de custo total por etiqueta fica para uma etapa seguinte, se aprovado.

## Pontos a confirmar
- Etiqueta opcional ou obrigatória em solicitações Internas?
- Uma solicitação recebe só uma etiqueta (proposto) ou várias?

## Detalhes técnicos
- Nova tabela `supply_tags` (name único sem distinção de maiúsculas, description, active, created_by, created_at) com GRANTs e RLS: leitura para usuários autenticados com acesso ao Supply; escrita via função `can_manage_supply_tags()` (Admin, papel `financeiro`, ou `is_supply_member`/comprador).
- Nova coluna nullable `purchase_orders.tag_id` referenciando `supply_tags`; trigger valida que só é preenchida quando `allocation_type = 'interna'` e que a etiqueta está ativa na inserção (históricos preservados).
- Nova permissão de menu `cadastro_etiquetas` seguindo as permissões efetivas existentes.
- Esquema compartilhado em `src/lib/supply-allocation.ts` recebe `tag_id` opcional; teste unitário para a regra "só Interna aceita etiqueta".
- RPC `supply_edit_purchase` passa a aceitar `tag_id` com registro antes/depois no Log.
