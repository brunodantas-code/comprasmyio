# Corrigir fotos no Relatório de Compras

## Objetivo
Fazer a opção **Incluir fotos** funcionar no Relatório de Compras, exibindo somente as imagens anexadas à pergunta **“Qual a vazão nominal do hidrômetro?”** e identificando cada imagem pela respectiva loja, quiosque ou ambiente.

## Alterações
- Localizar a pergunta de vazão por seu texto normalizado, respeitando o modelo aplicado a cada ponto.
- Selecionar somente anexos de imagem do tipo pergunta vinculados a essa pergunta e aos pontos incluídos no filtro do relatório.
- Exibir na prévia uma seção de fotos de hidrômetros, agrupada por loja/quiosque/ambiente e com sua identificação visível.
- Incluir o mesmo agrupamento no PDF colorido e no PDF P&B quando **Incluir fotos** estiver marcado.
- Manter o relatório sem imagens quando a opção estiver desmarcada e não incluir fotos gerais ou de outras perguntas.

## Validação
- Conferir prévia e PDF com **Incluir fotos** marcado e desmarcado.
- Confirmar que cada foto aparece somente no ponto correto e que os filtros de pontos continuam sendo respeitados.
