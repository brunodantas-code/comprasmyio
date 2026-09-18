# Conversas e pendências nos tickets do Code

## Objetivo
Permitir que Admin e Solicitante conversem dentro de cada ticket, registrar todas as mensagens no histórico e direcionar cada pessoa para a ação que depende dela.

## Alterações
- Criar uma conversa cronológica por ticket, visível apenas ao Solicitante e aos Admins autorizados do Code.
- Permitir ao Admin enviar uma pergunta ao Solicitante enquanto o ticket estiver ativo.
- Permitir ao Solicitante responder dentro do próprio ticket; a resposta encerra a pendência daquela pergunta.
- Exibir cada pergunta e resposta no histórico com autor, perfil, data e vínculo entre pergunta e resposta.
- Impedir novas mensagens em tickets concluídos ou excluídos e impedir respostas de pessoas não autorizadas.

## Pendências e navegação
- Para o Solicitante, contar como pendência do Code cada ticket com pergunta do Admin ainda sem resposta, além do aceite de tickets em **Atendido**.
- Na Central de Pendências, mostrar a ação com o número do ticket e abrir diretamente o ticket correspondente para resposta.
- Para o Admin, manter tickets **Em aberto** ou **Em atendimento** como pendentes até serem alterados para **Atendido**, preservando o contador vermelho no Code e na página principal do ERP.
- Atualizar os contadores imediatamente após pergunta, resposta ou mudança de situação.

## Segurança e dados
- Criar uma estrutura própria para as mensagens, com acesso protegido e vínculo ao ticket.
- Registrar a autoria pelo usuário autenticado, sem aceitar autoria informada pela tela.
- Garantir no banco que somente Admin do Code faça perguntas e somente o Solicitante do ticket responda.
- Garantir uma única resposta por pergunta e manter o conteúdo imutável para preservar o histórico.

## Validação
- Testar o fluxo Admin pergunta → Solicitante recebe alerta → abre o ticket → responde → alerta desaparece.
- Confirmar que o ticket continua pendente para o Admin até chegar a **Atendido**.
- Confirmar que mensagens e pendências não aparecem para usuários sem relação com o ticket.
- Validar a abertura direta do ticket e a apresentação em computador e celular.
