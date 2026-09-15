# Plano: confirmações de exclusão

## Objetivo
Garantir que toda ação de exclusão visível no sistema peça confirmação antes de remover qualquer registro.

## Implementação
- Localizar ações de excluir/remover ainda executadas diretamente.
- Aplicar a janela de confirmação já usada no sistema, preservando exclusões seguras com realocação.
- Manter textos claros sobre o item afetado e impedir envio repetido durante a exclusão.
- Validar os fluxos alterados e a compilação.
