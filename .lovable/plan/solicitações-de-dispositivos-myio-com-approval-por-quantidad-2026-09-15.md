# Solicitações de Dispositivos myio com Approval por Quantidade

## Objetivo
Integrar o formulário já existente de **Dispositivos myio** ao fluxo normal de Approvals, sem transformar sua tela no formulário padrão das demais solicitações.

## Experiência do usuário
- Recolocar **Dispositivos myio** na lista de **Tipo de Solicitação** em **Novas Solicitações**.
- Ao selecionar esse tipo, exibir o formulário específico já existente, mantendo produtos, quantidades, reposição, entrega e observações.
- Manter também o botão **+** ao lado de **Todos os status** abrindo o mesmo formulário.
- Acrescentar ao formulário a seleção independente de **Cliente** e **Projeto**; será possível informar um deles ou ambos, sem um filtrar ou preencher o outro.
- Em **Minhas Solicitações**, mostrar no bloco de dispositivos somente pedidos criados pelo usuário conectado.
- Exibir o número do Approval e sua situação para acompanhamento.
- Somente liberar produção, edição operacional e alteração de status após a aprovação final.

## Aprovação por quantidade
- Cada solicitação receberá um número de Approval e aparecerá em **Pendentes comigo**, **Meus em aprovação**, **Todos** e **Consolidado por Cargo**, conforme as permissões atuais.
- O fluxo seguirá o organograma e as etapas adicionais já configurados.
- Para Dispositivos myio, a alçada será calculada pela soma das quantidades de todos os produtos, sem valor financeiro.
- Adicionar no cadastro de usuários campos próprios para as faixas de quantidade de dispositivos, separados das alçadas financeiras atuais.
- Mostrar quantidade total no Approval; os totais monetários permanecerão zerados/não aplicáveis para esse tipo.

## Dados e segurança
- Vincular cada pedido de dispositivos ao seu Approval e ao cliente/projeto escolhidos.
- Criar o pedido e seus itens de forma atômica, derivando o solicitante da sessão autenticada; nenhum identificador de usuário enviado pela tela será aceito como dono.
- Restringir a leitura comum ao próprio solicitante; manter acesso operacional somente para os perfis já autorizados.
- Impedir ações operacionais antes da aprovação e impedir que uma reprovação libere o pedido.
- Preservar os pedidos de dispositivos já existentes e seu funcionamento atual.

## Validação
- Criar pela lista de tipos e pelo botão **+**, confirmando que ambos abrem o mesmo formulário específico.
- Testar Cliente e Projeto de forma independente.
- Confirmar geração do número, etapas corretas pela quantidade e aparição nas telas de Approvals.
- Confirmar que o solicitante vê somente os próprios pedidos e que outro usuário não consegue ler ou alterar seus registros.
- Confirmar bloqueio operacional antes da aprovação e liberação após a decisão final.
- Verificar computador, celular, compilação e execução.

## Detalhes técnicos
A integração reutilizará a estrutura existente de Approvals e manterá o pedido de dispositivos como registro operacional próprio. A ligação entre ambos permitirá que a decisão final controle a liberação do pedido sem duplicar a tela nem misturar o fluxo de dispositivos com os formulários comuns.
