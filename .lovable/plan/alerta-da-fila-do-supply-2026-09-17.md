# Alerta da Fila do Supply

## Objetivo
Fazer os pedidos aprovados que aguardam atuação do Time de Supply aparecerem como pendência operacional para usuários do Supply.

## Alterações
- Incluir a quantidade da Fila do Supply no cálculo central de pendências, apenas para usuários autorizados do Supply ou Admin.
- Somar essa quantidade ao indicador exibido no ícone do app Supply.
- Exibir “Fila do Supply” na Central de Pendências somente quando houver pedidos aguardando atuação.
- Manter ocultas todas as linhas com quantidade zero e preservar a mensagem “Nenhuma pendência no momento.” quando não houver ações.
- Validar que solicitantes sem função de Supply não recebam esse alerta.

## Regra operacional
Entram no alerta apenas approvals já aprovados e nos estados operacionais pendentes definidos para a Fila do Supply. O alerta desaparece quando deixam de exigir ação do Supply.
