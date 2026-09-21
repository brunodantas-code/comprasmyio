# Confirmação obrigatória em exclusões

## Objetivo
Garantir que nenhuma ação de excluir ou remover seja executada imediatamente após o clique, inclusive o botão de lixeira dos blocos de materiais.

## Alterações
- Corrigir primeiro a remoção de materiais na nova solicitação, exibindo uma confirmação com o nome/número do item antes de removê-lo.
- Aplicar o mesmo padrão às remoções temporárias de anexos, trechos de viagem/reembolso, unidades ainda não salvas e QR codes.
- Revisar todas as exclusões permanentes de cadastros, solicitações, pedidos, estoque e demais áreas, preservando as janelas de realocação ou bloqueio existentes.
- Usar uma confirmação padronizada com as opções **Cancelar** e **Excluir/Remover**, impedindo cliques repetidos enquanto a ação estiver em andamento.

## Validação
- Auditar novamente todos os botões de lixeira, X, Excluir e Remover para confirmar que nenhum dispara a ação diretamente.
- Testar visualmente o caso de Materiais e uma amostra das principais áreas no computador e no celular.
- Confirmar que cancelar mantém os dados intactos e que confirmar executa a exclusão uma única vez.
