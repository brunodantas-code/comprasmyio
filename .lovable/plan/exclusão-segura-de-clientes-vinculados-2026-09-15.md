# Exclusão segura de clientes vinculados

## Objetivo
Permitir excluir um cliente sem vínculos e bloquear a exclusão quando ainda houver registros associados, exigindo a realocação antes de continuar.

## Alterações
- Ampliar a verificação para considerar projetos e solicitações vinculados diretamente ao cliente.
- Exibir cada vínculo no pop-up, com sua identificação e seletor de novo cliente.
- Realocar o vínculo selecionado e atualizar também os registros derivados da mesma solicitação.
- Liberar o botão **Excluir** somente quando nenhum vínculo permanecer.
- Impedir no banco que uma exclusão silenciosa apenas remova o cliente dos registros vinculados.

## Validação
- Confirmar exclusão direta de cliente sem vínculos.
- Confirmar bloqueio e listagem para cliente com projeto ou solicitação vinculada.
- Realocar todos os itens e confirmar que a exclusão é liberada.
- Verificar que os novos clientes aparecem nos projetos e solicitações realocados.
