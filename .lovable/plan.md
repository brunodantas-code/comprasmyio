# Ajustes no cadastro de seções e perguntas

## O que será alterado
- Trocar o botão de salvar da seção pelo mesmo botão compacto com ícone de disquete usado nas perguntas.
- Destacar o cabeçalho da seção com título maior e em negrito, começando pelo número de ordenação à esquerda.
- Criar um cabeçalho “Perguntas” maior e em negrito, fora da área arrastável, removendo o rótulo “Pergunta” de cada campo.
- Adicionar controle `+` / `−` para exibir ou recolher todas as perguntas de cada seção.
- Manter cada seção como um único bloco arrastável, garantindo que sua área de perguntas acompanhe a mudança de posição.

## Detalhes técnicos
- O arraste de seções continuará restrito ao marcador numérico do cabeçalho.
- O arraste individual de perguntas continuará funcionando apenas dentro da área de perguntas da própria seção.
- As perguntas recolhidas permanecerão vinculadas e serão movidas com a seção, sem alteração dos dados.
- Validar o resultado em desktop e celular, incluindo ordenação, recolhimento e ausência de sobreposição.
