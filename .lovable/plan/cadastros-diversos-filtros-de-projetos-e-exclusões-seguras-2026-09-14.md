# Cadastros diversos, filtros de projetos e exclusões seguras

## Objetivo
Reorganizar as Etapas Adicionais dentro de **Cadastro > Diversos**, simplificar seus campos e garantir que elas sejam aplicadas somente aos Tipos de Solicitação escolhidos. Também melhorar a lista de Projetos e impedir exclusões que deixem solicitações sem vínculo.

## Alterações na tela

### Cadastro > Diversos
- Criar **Diversos** logo após **Lembretes**.
- Dentro dele, criar **Tipo de Etapa Adicional**.
- Mover a configuração de Etapas Adicionais para esse local e removê-la de **Approval Workflow**.
- No campo **Tipo**, manter somente:
  - Validação Técnica
  - Compliance
- Alterar o campo **Nome da Etapa** para exibir o texto de apoio **“Inserir nome”**.
- Remover o campo **Categoria** da criação, edição e tabela.
- Criar **Vincular ao Tipo de Solicitação**, permitindo marcar vários tipos: Materiais, Serviços, Viagens, Reembolsos, Contratação de RH, Importação, Dispositivos e Pagamento.
- Substituir o campo numérico **Ordem** por setas para mover cada etapa para cima ou para baixo. A sequência visual será a sequência usada na aprovação.

### Lista de Projetos
- Adicionar busca conjunta por **nome do projeto ou cliente**.
- Adicionar filtro por **status**: todos, ativo, implantado ou cancelado.
- Adicionar filtro por **faixa de orçamento**.
- Adicionar ordenação por nome, cliente, orçamento, solicitado, percentual, status ou data, com opção crescente/decrescente.
- Manter a tabela compacta e sem rolagem lateral no celular.

### Exclusão com vínculos
- Antes de excluir Projeto, Cliente ou Centro de Custo, contar as solicitações vinculadas.
- Sem vínculos, manter a confirmação simples de exclusão.
- Com vínculos, bloquear a exclusão e mostrar a quantidade encontrada.
- Oferecer a realocação **individual** de cada solicitação para outro cadastro do mesmo tipo.
- Exibir o número do Approval e a identificação da solicitação em cada linha, com seletor do novo destino.
- Permitir excluir somente depois que todas as solicitações tiverem sido realocadas.
- Atualizar as listas e os resumos de orçamento após cada realocação.

## Regras no banco de dados
- Adicionar às Etapas Adicionais a lista de Tipos de Solicitação vinculados.
- Atualizar a montagem da cadeia para incluir uma etapa adicional somente quando o tipo da solicitação estiver entre os vínculos configurados.
- Preservar a posição atual das etapas e normalizar a sequência após movimentações com as setas.
- Não alterar approvals já criados; a nova regra valerá para novas solicitações e para solicitações ainda sem decisão cuja cadeia seja recalculada pelo fluxo existente.
- Remover apenas as opções antigas do seletor; nenhum histórico de approval será apagado.

## Validação
- Testar criação, edição, ativação, exclusão e reordenação das Etapas Adicionais.
- Confirmar que Validação Técnica e Compliance aparecem somente nos Tipos de Solicitação vinculados.
- Testar filtros e todas as ordenações de Projetos em computador e celular.
- Testar exclusão sem vínculos e bloqueio com realocação individual para Projeto, Cliente e Centro de Custo.
- Confirmar que não há erros de compilação ou execução.
