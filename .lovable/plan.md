# LUC opcional e duplicidade confirmada

## Resultado
- Tornar o LUC opcional para lojas sem identificação oficial, mantendo Nome da loja obrigatório.
- Permitir Localização vazia ou repetida, adequada a casos como “G1 – Deck”.
- Ao informar um LUC já usado na mesma OS, mostrar o nome da loja existente e pedir confirmação antes de salvar outra loja com o mesmo LUC.
- Exibir lojas sem LUC de forma clara nas listas, seleção, histórico, relatórios e exportação.

## Cadastro individual
- Antes de incluir ou editar, comparar o LUC informado com as demais lojas ativas da OS.
- Se houver duplicidade, abrir confirmação com o LUC e os nomes das lojas existentes.
- “Cancelar” volta à edição; “Cadastrar mesmo assim” salva sem bloquear.
- LUC vazio não gera confirmação nem conflito.

## Importação por Excel
- Aceitar linhas com Nome da loja e LUC vazio.
- Preservar a atualização de uma loja existente somente quando houver correspondência inequívoca.
- Marcar LUC repetido na conferência para evitar atualização silenciosa da loja errada e permitir sua inclusão como novo registro após confirmação.

## Dados e compatibilidade
- Remover a exclusividade de LUC por OS e permitir valor vazio no cadastro e histórico.
- Manter todos os vínculos por identificador interno, portanto respostas, fotos, materiais e histórico continuam separados mesmo com LUCs iguais.
- Preservar a regra atual que diferencia correção cadastral de troca real de loja.

## Validação
- Conferir inclusão sem LUC, Localização repetida, duplicidade confirmada e cancelada.
- Conferir edição, lista, seleção do checklist, relatório e exportação com e sem LUC.
- Validar em computador e celular.
