# Corrigir salvamento da pergunta 12 do padrão Shoppings

## Diagnóstico
A pergunta já possui uma ação vinculada e essa ação foi usada por um chamado. Ao salvar, a tela tenta excluir o vínculo antigo e recriá-lo; como o histórico do chamado impede a exclusão, o vínculo permanece e a nova inclusão gera a duplicidade mostrada.

## Alterações
- Substituir a exclusão e recriação pelo reaproveitamento do vínculo existente, atualizando a ação e a resposta que a dispara.
- Quando “Gerar ação” for desmarcado, desativar o vínculo sem apagar o histórico dos chamados existentes.
- Tratar eventuais vínculos ativos excedentes, mantendo apenas a configuração atual da pergunta.
- Exibir mensagens claras em português se alguma etapa do salvamento falhar, sem indicar sucesso parcial.

## Validação
- Editar e salvar a pergunta 12 mantendo a mesma ação.
- Alterar a ação ou a resposta disparadora e salvar novamente.
- Desmarcar e reativar “Gerar ação”.
- Confirmar que chamados já gerados continuam vinculados e que o projeto permanece sem erros.

## Observação técnica
A correção será feita no fluxo de atualização da pergunta, preservando o identificador da regra já referenciada por chamados. Não será necessário apagar respostas nem chamados existentes.
