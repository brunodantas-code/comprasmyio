# Padronização dos botões de ação

## Objetivo
Uniformizar em todas as telas os botões compactos de adicionar, remover, editar e excluir conforme o padrão visual já usado em Clientes.

## Alterações
- Aplicar aos botões de ação em listas e tabelas o tamanho compacto de Clientes: 24 × 24 px, ícones de 14 × 14 px e espaçamento consistente.
- Substituir ícones `X` usados para exclusão ou remoção pelo ícone de lixeira.
- Manter botões textuais de formulário e ações principais em seus tamanhos atuais; a padronização compacta será aplicada apenas aos botões de ação por ícone.
- Revisar Solicitações, Approvals, Cadastros, Armazém, Code e seus submenus para eliminar variações restantes.
- Preservar cores, permissões, confirmações e comportamentos existentes.

## Detalhes técnicos
- Usar `size="icon"`, `h-6! w-6! shrink-0` e ícones `h-3.5 w-3.5` nas ações compactas.
- Usar `Trash2` com estilo destrutivo em exclusões.
- Validar visualmente as telas afetadas e corrigir eventuais regressões de alinhamento.
