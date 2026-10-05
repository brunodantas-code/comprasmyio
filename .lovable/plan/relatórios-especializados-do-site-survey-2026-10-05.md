# Relatórios especializados do Site Survey

## Objetivo
Criar três formatos adicionais no relatório da visita, mantendo os filtros já existentes por loja, quiosque, ambiente ou pontos específicos e permitindo revisar os dados antes de baixar ou gerar uma solicitação.

## Seleção do relatório
- Incluir um seletor de tipo: **Relatório completo**, **Relatório de compras**, **Intervenções do cliente** e **Equipamentos e ferramentas**.
- Preservar a seleção de pontos específicos e as opções de PDF colorido/P&B.
- Adaptar a prévia, o título, o conteúdo e o nome do arquivo ao tipo escolhido.
- Exibir uma mensagem objetiva quando o tipo selecionado não possuir itens.

## Relatório de compras
- Identificar cada ponto cuja resposta indique saída pulsada inexistente, não funcional ou inoperante; respostas ausentes ou “Não informado” não serão convertidas automaticamente em compra.
- Recomendar **1 hidrômetro por ponto**, mostrando loja/quiosque/ambiente, localização do hidrômetro, vazão e DN calculado pelo De-Para vigente.
- Acrescentar os materiais cadastrados na visita, com descrição, quantidade e local de uso, sem misturar equipamentos/ferramentas como itens de compra.
- Consolidar quantidades sem perder a relação com os pontos de origem.
- Disponibilizar **Gerar solicitação de materiais** somente depois da prévia. O botão abrirá o formulário atual de materiais já preenchido com projeto/cliente, observação da visita, quantidades e sugestões.
- Para cada hidrômetro recomendado, o usuário deverá escolher o item correspondente no catálogo comprável. Itens da visita sem vínculo inequívoco também ficarão pendentes de confirmação no formulário.
- Manter obrigatórios prazo, entrega, destinatário e valor estimado conforme as regras atuais. Somente o envio final criará o Approval, reutilizando integralmente a cadeia de aprovação existente.
- Evitar duplicidade: uma nova solicitação a partir da mesma visita exigirá confirmação quando já houver outra gerada anteriormente.

## Relatório de Intervenções do cliente
- Mostrar apenas pontos com intervenções ativas, com nome da loja/quiosque/ambiente, problema encontrado e eventual número do chamado.
- Incluir somente imagens anexadas à pergunta que originou cada intervenção, usando o vínculo já registrado entre foto e pergunta.
- Não exibir fotos gerais do ponto, planejamento, respostas técnicas, ferramentas ou outros chamados.
- Manter uma apresentação curta e própria para encaminhamento ao cliente.

## Relatório de equipamentos e ferramentas
- Listar apenas os equipamentos e ferramentas selecionados na visita.
- Mostrar tipo, especificação complementar, quantidade e loja/quiosque/ambiente onde serão utilizados.
- Usar as observações registradas no item como detalhe de aplicação e o próprio ponto como localização principal.
- Consolidar por item quando os totalizadores estiverem habilitados, preservando abaixo a distribuição por local.

## Dados e integração
- Extrair as regras dos relatórios para funções compartilhadas, evitando divergência entre prévia e PDFs.
- Criar um rascunho seguro de solicitação associado à visita para transportar os itens até o formulário de materiais e registrar o Approval criado.
- Restringir leitura e criação às pessoas autorizadas a visualizar a visita e criar solicitações; o relatório não concederá permissão adicional.
- Não criar itens livres nem alterar os catálogos do Supply; toda compra continuará usando somente itens cadastrados.

## Validação
- Testar respostas com saída pulsada operante, inexistente, inoperante e não informada, conferindo quantidade e DN.
- Validar materiais repetidos em vários pontos e a seleção manual dos itens compráveis antes do envio.
- Confirmar que o Approval nasce apenas após o envio completo do formulário e segue a alçada atual.
- Conferir que cada intervenção mostra somente suas próprias fotos e que pontos sem intervenção são omitidos.
- Validar equipamentos/ferramentas e seus locais na prévia e nos PDFs colorido/P&B.
- Revisar computador e celular, além de inspecionar visualmente todas as páginas dos PDFs.
