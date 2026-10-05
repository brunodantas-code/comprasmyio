# Padronização dos botões de ação do ERP

## Objetivo
Aplicar em todo o ERP, inclusive nos pop-ups, o padrão visual aprovado: botões de ação sem fundo, com borda, ícone e texto verdes; ao passar o cursor, focar ou clicar, o fundo fica verde com contraste adequado.

## Implementação
1. Criar uma variante compartilhada de botão para ações, evitando estilos repetidos e mantendo o comportamento consistente.
2. Aplicar essa variante aos comandos **Salvar**, **Excluir**, **Cancelar** e **Confirmar**, incluindo variações de texto como “Salvar alterações”, “Confirmar exclusão” e ações equivalentes em janelas de confirmação.
3. Preservar botões apenas de navegação, ícones compactos e ações que não pertencem a esses quatro comandos.
4. Manter estados desabilitado, carregando, foco por teclado e contraste nos temas claro e escuro.
5. Verificar as telas principais e pop-ups em desktop e celular, além da compilação do ERP.

## Detalhes técnicos
- Centralizar o estilo no componente compartilhado de botão.
- Substituir classes locais conflitantes somente nos botões abrangidos.
- Não alterar regras de negócio, confirmações ou permissões.