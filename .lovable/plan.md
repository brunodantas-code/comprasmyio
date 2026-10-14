# Consolidar o histórico e o saneamento no Resumo de Visitas

## Alterações
- Exibir em **Realizar Visita** somente visitas agendadas ou em andamento; visitas concluídas ficam exclusivamente em **Resumo de Visitas**.
- Remover da visita no Resumo os botões e painéis separados **Resumo da visita** e **Cadastro e pendências**.
- Manter uma única lista de lojas, quiosques e ambientes no Resumo, preservando miniatura de fachada, inclusão, edição, exclusão, importação/exportação e filtros.
- Em cada linha, manter quantidade e expansão das pendências e incluir uma segunda expansão para o histórico completo do checklist respondido, com respostas, fotos e materiais já registrados.
- Permitir no mesmo ambiente administrativo adicionar ambientes, corrigir cadastro, responder ou adicionar perguntas do cliente e concluir pendências sem reabrir a visita técnica nem alterar sua data original de conclusão.
- Restringir essas alterações posteriores ao usuário master ou a quem já possui as permissões delegadas de edição/execução aplicáveis.

## Detalhes técnicos
- Reutilizar os dados e a apresentação atuais do Resumo da Visita dentro das linhas dos gerenciadores de lojas/LUCs e ambientes, evitando duplicar consultas ou registros.
- Manter os controles de expansão independentes por linha e compatíveis com computador e celular.
- Preservar integralmente respostas, fotos, horários técnicos, status e histórico existentes.

## Verificação
- Confirmar que a visita de Mogi, concluída em 07/10/2026, não aparece em **Realizar Visita** e continua em **Resumo de Visitas**.
- Abrir uma linha no Resumo e conferir cadastro, pendências e histórico do checklist no mesmo local.
- Testar inclusão/edição de ambiente e pergunta/resposta do cliente sem mudar a visita para “Em andamento” nem alterar sua data de conclusão.
- Conferir a tela em computador e celular.
