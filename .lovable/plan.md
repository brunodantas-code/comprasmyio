# Classificações mensais do Cash Flow

## Regra financeira
- Todo pagamento recebido do myio supply e toda movimentação bancária terá três referências obrigatórias, armazenadas por mês/ano:
  - **Emissão fiscal**: mês em que o documento foi emitido.
  - **Competência**: mês ao qual a despesa ou receita pertence.
  - **Caixa**: mês previsto ou realizado do pagamento.
- A classificação no Plano de Contas continuará sendo obrigatória para concluir a classificação financeira.
- No pagamento, a referência de Caixa começa como previsão e passa a refletir o mês efetivo da movimentação conciliada.

## Dados existentes e novos
- Pagamentos já existentes: Emissão pelo mês de criação; Competência inicialmente igual à Emissão; Caixa pelo pagamento, vencimento ou criação, nessa ordem.
- Novos approvals: aplicar a mesma regra ao entrarem no Cash Flow, garantindo que nenhum dos três períodos fique vazio.
- Movimentações bancárias existentes e novas: preencher inicialmente Emissão, Competência e Caixa com o mês da movimentação importada.
- Registrar no histórico alterações das três referências mensais, além das alterações do Plano de Contas e da situação.

## Contas a pagar
- Substituir a classificação direta por uma tela de classificação com Plano de Contas, Emissão, Competência e Caixa.
- Exigir os quatro campos antes de retirar o pagamento de **Classificar**.
- Mostrar as três referências no detalhe do Approval e disponibilizar edição posterior.
- Ao conciliar, atualizar a referência de Caixa do pagamento para o mês efetivo da movimentação bancária.

## Caixa
- Incluir Plano de Contas e as três referências na visualização das movimentações.
- Na importação OFX/CSV, preencher automaticamente os três períodos com o mês bancário.
- Permitir corrigir Plano de Contas, Emissão e Competência e manter Caixa vinculado ao mês real do extrato.

## Validação
- Validar classificação, importação e conciliação no computador e no celular.
- Confirmar que registros antigos continuam disponíveis e que nenhum novo registro financeiro fica sem as três referências.
