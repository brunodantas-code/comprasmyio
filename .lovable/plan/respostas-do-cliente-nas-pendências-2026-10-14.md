# Respostas do cliente nas pendências

## Objetivo
Permitir registrar a resposta de cada pergunta ao cliente no próprio card de Pendências de Cadastro ou na Seção 7 do checklist, mantendo um único histórico por loja, quiosque ou ambiente.

## Implementação
- Guardar cada resposta junto da respectiva pergunta, sem alterar ou tentar separar automaticamente os textos existentes.
- Na Seção 7, exibir um campo de resposta abaixo de cada pergunta e salvar pergunta, resposta e situação no mesmo registro do checklist.
- No card de pendências, exibir o mesmo campo abaixo da pergunta com fundo verde-claro; alterações feitas ali aparecem também na Seção 7.
- Manter edição e exclusão atuais e preservar respostas ao editar o texto da pergunta.
- Não baixar a pendência ao preencher a resposta. A baixa continuará exigindo a seleção e confirmação manual do checkbox.
- Após a baixa, manter pergunta e resposta no histórico da Seção 7 e retirar apenas a pendência do card; esconder o card quando não restarem outras pendências.

## Detalhes técnicos
- Estender o conteúdo já salvo da resposta da Seção 7 com respostas vinculadas pelo texto da pergunta, preservando compatibilidade com registros antigos.
- Atualizar em conjunto os fluxos de inclusão, edição, exclusão, salvamento do checklist e baixa manual para não perder respostas nem marcações existentes.
- Não criar estrutura nova no banco; o histórico continuará no registro atual do checklist.

## Validação
- Conferir inclusão e edição da resposta pelos dois locais e releitura após atualizar a página.
- Confirmar que preencher a resposta não remove a pendência e que somente o checkbox confirmado a remove.
- Confirmar que pergunta e resposta baixadas continuam na Seção 7 e que o card desaparece quando fica sem pendências.
- Conferir o resultado no computador e no celular, sem alterar os textos atuais.
