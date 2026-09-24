# Plano — conclusão por loja no Site Survey

## Objetivo
Trocar “Enviar para revisão” por **“Concluir visita”** e tratar o encerramento de cada Loja/LUC separadamente, mantendo a visita geral em andamento até que todos os pontos estejam completos.

## Alterações
- Adicionar ao cadastro de Loja/LUC e ambiente o registro de conclusão, com data e responsável.
- Ao clicar em **Concluir visita**, validar o checklist da loja selecionada e apresentar a lista exata de campos, fotos ou materiais pendentes.
- Se houver pendências, permitir **salvar com pendências** sem concluir a loja; registrar no histórico da visita o ponto, a etapa 7 e os campos não preenchidos.
- Se não houver pendências, salvar o checklist e marcar somente a loja selecionada como concluída.
- Exibir no seletor quais lojas estão concluídas e quais ainda estão pendentes, liberando a escolha da próxima loja após cada salvamento.
- Concluir a visita geral apenas quando o checklist geral e todas as lojas/ambientes ativos estiverem preenchidos e concluídos; então encaminhar automaticamente para revisão no fluxo atual.

## Detalhes técnicos
- Migração aditiva nas tabelas de lojas e ambientes, preservando todos os dados atuais e as regras de acesso existentes.
- Reutilização do histórico atual da OS para gravar um evento estruturado de salvamento com pendências.
- A validação usará as mesmas regras atuais de obrigatoriedade, condicionais, fotos e decisão de materiais, evitando critérios divergentes entre a tela e a conclusão.

## Validação
- Testar uma loja completa e outra incompleta.
- Confirmar a lista de pendências e o registro na etapa 7/histórico.
- Confirmar que a visita geral não encerra antes de todas as lojas e que a próxima loja pode ser selecionada após salvar.
- Conferir em celular e computador.
