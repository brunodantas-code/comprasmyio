# Relatório técnico e tempos por ponto do Site Survey

## Objetivo
Criar um relatório completo de cada OS e registrar corretamente o tempo individual de cada loja ou ambiente, incluindo fotos, ações, estimativa de instalação e apuração de horas trabalhadas.

## Experiência na visita
- Adicionar um ícone de relatório no canto direito da linha **Site Survey #...**, disponível durante e após a execução.
- Ao clicar, abrir uma prévia organizada na tela com opção de baixar **PDF colorido** ou **PDF para impressão em P&B**.
- No seletor e no preenchimento de cada loja/ambiente, incluir **Iniciar visita** e a captura/seleção da **foto da fachada**.
- Registrar o horário de início no primeiro evento entre o clique em **Iniciar visita** e o envio da foto da fachada, sem sobrescrever esse horário depois.
- Exigir uma foto de fachada identificada para concluir cada loja ou ambiente, inclusive os pontos pré-cadastrados pelo Suporte.
- Registrar a conclusão individual no momento em que o checklist daquele ponto for concluído; pontos cancelados permanecem fora da conclusão geral, como hoje.

## Conteúdo do relatório
- Identificação da OS, situação, cliente, razão social, unidade/filial, projeto, endereço, contato e agendamento.
- Técnicos responsáveis e participantes, horários gerais e horários individuais de cada loja/ambiente.
- Resumo das respostas e anotações da Etapa 7 de cada ponto.
- Totalizadores por tipo de hidrômetro, dificuldade de acesso, complexidade e situação dos quadros/pontos elétricos.
- Chamados gerados, ações do suporte, mensagens, alterações de situação e intervenções solicitadas ao cliente.
- Seção por loja/ambiente com resumo textual das respostas relevantes, situação, duração e todas as fotos em miniaturas legíveis.
- Resumo de tempo estimado versus realizado, horas extras e horas noturnas.

## Premissas de instalação
- Criar em **Cadastro** uma área recolhida de **Premissas de tempo**, no padrão dos demais cadastros.
- Permitir criar regras por pergunta e resposta do checklist, com descrição e quantidade de minutos adicionados por ocorrência.
- Somar as regras aplicáveis às respostas salvas de todas as lojas e ambientes ativos; regras sem correspondência não adicionam tempo.
- Mostrar no relatório a composição da estimativa, evitando um total sem explicação.

## Cálculo de jornada
- Somar somente os intervalos individuais com início e conclusão registrados.
- Separar automaticamente o período noturno entre **22:00 e 05:00**, inclusive quando o intervalo atravessar a meia-noite.
- Apurar como hora extra o que exceder **8 horas trabalhadas em cada dia**, evitando contar duas vezes períodos simultâneos.
- Exibir pontos sem início ou sem conclusão como dados incompletos, sem inventar duração.
- Calcular e salvar o resumo final quando a visita geral for concluída, mantendo-o disponível no relatório após reabertura.

## Dados e segurança
- Acrescentar campos de início e foto de fachada às lojas e ambientes sem alterar registros existentes.
- Criar cadastro de premissas com acesso pelas permissões atuais de **Cadastro e Diversos**.
- Armazenar a foto da fachada no repositório privado de anexos já usado pelo Site Survey e identificá-la separadamente das demais fotos.
- Manter as regras atuais de acesso: somente usuários autorizados para a OS podem abrir ou baixar o relatório.

## Validação
- Testar início pelo botão e pela foto, garantindo que o primeiro horário seja preservado.
- Confirmar bloqueio da conclusão sem foto da fachada em loja e ambiente.
- Conferir totalizadores, ações do OpDesk, anotações da Etapa 7 e cálculo das premissas com casos reais.
- Validar intervalos diurnos, noturnos, atravessando meia-noite e acima de 8 horas no mesmo dia.
- Conferir prévia e PDFs colorido/P&B, todas as páginas e miniaturas, no computador e no celular.