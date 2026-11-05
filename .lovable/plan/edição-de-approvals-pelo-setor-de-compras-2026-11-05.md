# Edição de approvals pelo setor de Compras

## Situação atual
O lápis de edição está restrito a administradores. O setor de Compras pode acompanhar a execução, mas não corrigir os dados de solicitações feitas por outros usuários.

## Solução proposta

### 1. Edição pelo Compras
- Exibir o lápis verde para os usuários autorizados do setor de Compras, independentemente de quem abriu a solicitação.
- Disponibilizar a edição nas listas de Approvals e na Fila do Supply.
- Manter o solicitante original; editar não transfere a autoria da solicitação.
- Não ampliar permissões de aprovação, exclusão, administração ou pagamentos do Cash Flow.

### 2. Campos que poderão ser corrigidos
- Valor unitário de cada item, quantidade e total recalculado. Isso permite corrigir pedidos antigos com R$ 0,00 para o valor encontrado na cotação.
- Link da cotação e observações do Compras.
- Destinatário, endereço/ponto de entrega ou retirada e previsão de entrega.
- Prazo e demais informações operacionais da compra.
- Preservar a identidade do item cadastrado, a autoria e as decisões de aprovação. Alterações de tipo, cliente/projeto e centro de custo continuam sujeitas às permissões atuais, sem liberação automática para Compras.

**Exemplo:** o pedido do Bruno continua sendo dele; Compras atualiza o valor e registra Teles como destinatário da retirada, com o local e a observação correspondentes.

### 3. Histórico completo no Log
Ao salvar uma mudança real, registrar:
- Número da solicitação e usuário que alterou.
- Data e hora.
- Campos modificados, com valor anterior e novo.
- Motivo da alteração, obrigatório no formulário.

Não apagar registros anteriores nem gerar log/e-mail quando nada mudou.

### 4. E-mail ao solicitante
- Após o salvamento, enviar ao solicitante original a mensagem: **“Sua solicitação foi alterada pelo supply”**.
- Incluir número da solicitação, quem alterou, resumo das mudanças, motivo e acesso à solicitação.
- Registrar o resultado do envio. Uma falha de e-mail não desfaz a correção salva nem aparece como envio bem-sucedido; permitir nova tentativa sem duplicar a alteração.

### 5. Aprovações e pedidos já executados
- Preservar as decisões e o histórico já registrados; uma edição não equivale a uma nova aprovação.
- Se a mudança de valor exigir aprovação adicional pelas regras da Companhia, sinalizar e encaminhar para essa aprovação antes de liberar a execução, sem apagar decisões anteriores.
- Permitir corrigir informações de entrega/retirada em pedidos já comprados ou recebidos, para refletir a realidade, sem movimentar estoque novamente.
- Valores estimados e valores efetivos da compra continuam distintos; a correção não altera lançamentos financeiros ou estoque silenciosamente.
- Solicitações canceladas continuam protegidas contra alterações operacionais pelo Compras.

## Detalhes técnicos
- Validar a autorização de Compras no salvamento, não apenas pela presença do lápis.
- Reutilizar a edição existente com uma lista restrita de campos para Compras; manter a edição administrativa atual.
- Salvar alteração e auditoria de forma atômica e vincular a notificação ao evento salvo.
- Usar o serviço de e-mail já configurado no projeto; verificar sua disponibilidade antes da implementação.
- Testar edição de pedido de outro solicitante, alteração de valor e entrega, bloqueio de usuário não autorizado, preservação de decisões, log e notificação.

## Resultado esperado
Compras poderá ajustar pedidos de qualquer solicitante para refletir a cotação e a entrega real, com rastreabilidade e cientificação, sem receber poderes administrativos adicionais.