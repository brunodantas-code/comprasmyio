# Fluxo de atendimento e aceite dos tickets do Code

## Objetivo

Deixar claro que o campo de usuário em **Gestão do ticket** identifica quem executará a correção ou melhoria, separar a entrega do aceite e avisar o solicitante quando houver tickets aguardando sua confirmação.

## Alterações

- Renomear o campo de usuário para **Responsável pela execução**.
- Mostrar nessa lista somente Admins do ERP que também estejam com acesso ao Code habilitado.
- Substituir o fluxo atual por **Em aberto**, **Em atendimento**, **Atendido** e **Concluído**.
- Permitir que Admins façam a gestão operacional até **Atendido**, mas não escolham **Concluído** nessa gestão.
- Quando um ticket estiver **Atendido**, mostrar ao solicitante a ação **Marcar como concluído**.
- Permitir essa conclusão somente ao solicitante original, inclusive quando ele também for Admin.
- Exibir uma notificação numérica no canto do ícone do Code, na Plataforma ERP, contando os tickets **Atendidos** daquele solicitante.
- Remover o status **Cancelado** do novo fluxo e preservar o histórico das mudanças.

## Segurança e dados

- Aplicar as regras também no banco para impedir alterações indevidas fora da tela.
- Validar que o responsável escolhido continue sendo Admin e tenha acesso ativo ao Code.
- Manter **Concluído** como estado final, alcançado somente a partir de **Atendido** pelo solicitante.
- Adequar os registros existentes aos novos nomes de situação sem perder tickets ou histórico.

## Validação

- Conferir os fluxos de Admin, solicitante comum e solicitante que também seja Admin.
- Confirmar que o contador aparece apenas para o dono dos tickets atendidos e desaparece após a conclusão.
- Validar a tela em computador e celular.