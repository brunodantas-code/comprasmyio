# Aplicativo Desenvolvimento

## Objetivo
Criar no portal o aplicativo **Desenvolvimento**, destinado à abertura e ao acompanhamento de tickets de melhorias e bugs de todos os aplicativos.

## Portal e acessos
- Adicionar um sexto ícone ao portal, usando o símbolo de código enviado como referência e mantendo a proporção dos demais aplicativos.
- Exibir o nome **Desenvolvimento** e uma descrição curta sobre melhorias e bugs.
- Incluir o aplicativo na área **Acessos**, permitindo ao Admin do ERP liberar ou remover o acesso por usuário.
- Manter o botão de retorno à Plataforma ERP dentro do novo aplicativo.

## Abertura de tickets
- Criar formulário com: aplicativo afetado, tipo (Melhoria ou Bug), título, descrição, prioridade, urgência, resultado esperado e anexo opcional.
- Registrar automaticamente autor, data de abertura e situação inicial **Aberto**.
- Validar os campos obrigatórios e apresentar confirmação após o envio.

## Acompanhamento
- Exibir ao usuário os tickets criados por ele e os tickets pelos quais seja responsável.
- Permitir pesquisa e filtros por aplicativo, tipo, prioridade e situação.
- Usar o fluxo: **Aberto**, **Em andamento**, **Concluído** e **Cancelado**.
- Mostrar detalhes e histórico de atualizações de cada ticket.

## Administração
- Somente Admins do ERP poderão alterar situação, responsável e observações administrativas.
- Usuários comuns poderão criar tickets e acompanhar os tickets permitidos, sem alterar o andamento administrativo.
- Registrar no histórico cada mudança de situação, responsável e observação.

## Dados e segurança
- Criar estruturas para tickets, anexos e histórico, com acesso protegido.
- Garantir que autor e responsável visualizem apenas os tickets relacionados a eles.
- Garantir que Admins do ERP visualizem e gerenciem todos os tickets.
- Salvar anexos em área privada e disponibilizá-los somente a usuários autorizados.
