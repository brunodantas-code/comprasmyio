# Contador de pendências por etapa

## Objetivo
Substituir a etiqueta “Pendente” dos blocos do checklist por uma bolinha vermelha com a quantidade de itens pendentes, posicionada sobre o número da etapa, no computador e no celular.

## Comportamento
- Não mostrar contador em etapas que ainda não tiveram progresso salvo.
- Após clicar em “Salvar progresso”, calcular e mostrar a quantidade de pendências de cada etapa iniciada.
- Atualizar o contador nos salvamentos seguintes.
- Remover a bolinha quando todas as exigências daquela etapa estiverem preenchidas.
- Manter a lista detalhada de pendências da etapa 7 e os bloqueios de conclusão atuais.

## Implementação
- Reaproveitar respostas, fotos e o registro de último progresso já existentes para determinar se o checklist foi salvo.
- Calcular a contagem por seção usando as mesmas regras atuais de obrigatoriedade, condições e fotos.
- Alterar somente o cabeçalho visual das etapas; demais etiquetas de situação de lojas e visitas permanecem inalteradas.
- Validar em 1280 px e 390 px, incluindo antes e depois de salvar progresso.
