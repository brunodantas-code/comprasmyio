# Padronização global dos botões de ação

## Objetivo
Uniformizar em todo o ERP os controles de adicionar, expandir/recolher, editar e excluir pelo padrão compacto já usado em Cadastro > Clientes.

## Alterações
- Aplicar dimensão fixa de 24 × 24 px aos botões apenas com ícone de `+`, `−`, lápis e exclusão.
- Aplicar ícones de 14 px, espaçamento estável e alinhamento consistente entre ações vizinhas.
- Substituir o ícone `X` por lixeira quando a ação representar exclusão ou remoção de um registro, item ou anexo.
- Preservar o `X` somente quando sua função semântica for fechar uma janela, cancelar uma seleção ou limpar conteúdo.
- Revisar Solicitações, Approvals, Cadastro, Estoques, Supply, Cash Flow, Code e demais menus e submenus.
- Manter botões textuais de criação, como “Criar” ou “Adicionar etapa”, sem redução; o padrão compacto vale para controles representados somente por ícones.

## Detalhes técnicos
- Centralizar o estilo compacto no componente de botão para evitar novas divergências.
- Atualizar acionadores personalizados que hoje sobrescrevem o tamanho padrão.
- Manter `title` e `aria-label` em todos os botões compactos.
- Validar visualmente no desktop e no mobile, incluindo ausência de sobreposição e rolagem lateral indevida.
