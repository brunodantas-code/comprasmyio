# Adiantamento de Despesas no Spend

## O que o usuário verá
- **Financeiro/Admin:** nova aba **Adiantamentos** no Spend para registrar um adiantamento (colaborador, valor, data do pagamento, finalidade/projeto opcional, prazo para prestar contas). Lista com Adiantado, Comprovado, Saldo e situação (Aberto, Prestado, Encerrado).
- **Colaborador:** em Meus comprovantes, um bloco destacado **Prestação de contas** por adiantamento aberto, com barra de saldo (adiantado x comprovado x restante), separado dos comprovantes de Cartão e de Reembolso.
- **Terceiro símbolo:** além de Cartão e $, um ícone de **carteira/envelope de dinheiro** identifica comprovantes de adiantamento em todas as listas e na Conciliação.
- **Envio:** na captura, a forma de pagamento ganha a opção **Adiantamento**, escolhendo o adiantamento aberto do colaborador. Comprovantes de adiantamento nunca geram solicitação no Supply nem entram em fatura de cartão.

## Regras
- Cada comprovante aprovado abate do saldo; o total vinculado não pode passar do valor adiantado (o excedente deve ser enviado como Reembolso).
- Mesmas conferências de hoje (foto, CNPJ, confirmação, categoria informativa); Plano de Contas e Centro de Custo continuam só com o Financeiro, que aprova cada comprovante na prestação.
- Financeiro encerra a prestação: saldo zero = Prestado; com saldo restante, registra devolução do colaborador ou desconto (com observação). Tudo fica no histórico/auditoria.
- Pendências: adiantamento com prazo vencido e saldo aberto aparece na Central para o colaborador; comprovantes aguardando aprovação aparecem para o Financeiro.

## Detalhes técnicos
- Nova tabela `spend_advances` (holder_id, amount, paid_at, due_at, purpose, project_id, status, closed_reason, closed_by, audit) com RLS: Financeiro/Admin gerenciam; colaborador lê só os seus.
- `spend_receipts.payment_source` passa a aceitar `advance` + coluna `advance_id`; RPC de captura valida dono do adiantamento, status aberto e saldo sob lock (`FOR UPDATE`), sem `card_id` de fatura.
- Helper puro de saldo (`advance.ts`) com testes: abatimento, bloqueio de excedente, encerramento.
- Ícone novo em `icons.tsx`; reutilizar `MilestoneTimeline` para o histórico.
