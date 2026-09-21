# Edição administrativa de Approvals

## Resultado
- Exibir um botão compacto de **lápis** nos Approvals para usuários Admin.
- Permitir editar os dados da solicitação: alocação, centro de custo, destinatário, ponto/endereço de entrega, prazo, observações, itens, quantidades e valores.
- Manter bloqueados o número do Approval, solicitante, decisões, etapas e histórico da aprovação.
- Disponibilizar a edição tanto durante a aprovação quanto após sua conclusão.

## Interface
- Incluir o lápis nas listagens de Approvals, seguindo o padrão visual compacto já usado no sistema.
- Abrir uma janela de edição preenchida com os dados atuais.
- Oferecer as opções de alocação **Interna**, **Projeto**, **Cliente** e **Unidade/Filial**, com seleção pesquisável quando aplicável.
- Permitir selecionar ou trocar o Centro de Custo, inclusive para Approvals alocados como Interna.
- Adaptar os campos ao tipo da solicitação e aos itens agrupados, sem expor controles que não se aplicam ao Approval.

## Consistência e histórico
- Salvar a alteração de forma transacional e restrita ao Admin.
- Registrar no histórico do Approval quem editou, quando editou e quais campos foram alterados.
- Quando o Approval já tiver uma conta a pagar, sincronizar descrição, valor, projeto/cliente/unidade e centro de custo no Cash Flow.
- Atualizar os vínculos operacionais derivados quando a alocação for alterada, sem recriar Approval, etapas ou conta a pagar.
- Recalcular os indicadores de orçamento quando projeto, itens, quantidades ou valores forem modificados, sem refazer decisões já tomadas.

## Validação
- Confirmar que usuários sem perfil Admin não veem nem conseguem usar a edição.
- Testar um Approval em aprovação e outro concluído com conta a pagar.
- Validar alteração para Interna com Centro de Custo e realocação entre Projeto, Cliente e Unidade/Filial.
- Confirmar histórico, totais, Cash Flow e vínculos derivados após a edição.
- Validar a janela e as ações no computador e no celular.
