export type AdvanceLike = { id: string; amount: number; status: string };
export type AdvanceReceiptLike = { advance_id: string | null; amount: number; status: string };

const cents = (value: number) => Math.round(value * 100);

/** Saldo da prestação: comprovado = aprovados; enviado = todos os vinculados; saldo = adiantado − enviado. */
export function advanceBalance(advance: AdvanceLike, receipts: AdvanceReceiptLike[]) {
  const linked = receipts.filter(r => r.advance_id === advance.id);
  const sent = linked.reduce((sum, r) => sum + cents(r.amount), 0);
  const approved = linked.filter(r => r.status === "approved").reduce((sum, r) => sum + cents(r.amount), 0);
  const total = cents(advance.amount);
  return { amount: total / 100, sent: sent / 100, approved: approved / 100, pendingReview: (sent - approved) / 100, remaining: Math.max(0, total - sent) / 100, count: linked.length };
}

/** Bloqueia comprovante que ultrapassa o saldo ainda não comprovado (o excedente vai como Reembolso). */
export function advanceAcceptsAmount(advance: AdvanceLike, receipts: AdvanceReceiptLike[], amount: number, editingReceipt?: { advance_id: string | null; amount: number }) {
  if (advance.status !== "open" || amount <= 0) return false;
  const others = receipts.filter(r => r.advance_id === advance.id);
  const used = others.reduce((sum, r) => sum + cents(r.amount), 0) - (editingReceipt?.advance_id === advance.id ? cents(editingReceipt.amount) : 0);
  return used + cents(amount) <= cents(advance.amount);
}

/** Encerramento: saldo zero fecha como Prestado; com saldo restante exige devolução ou desconto com observação. */
export function advanceCloseRequirement(advance: AdvanceLike, receipts: AdvanceReceiptLike[]) {
  const linked = receipts.filter(r => r.advance_id === advance.id);
  if (linked.some(r => r.status !== "approved")) return "pending_receipts" as const;
  return advanceBalance(advance, receipts).remaining > 0 ? "balance_resolution" as const : "settled" as const;
}

export const advanceStatusLabels: Record<string, string> = { open: "Aberto", settled: "Prestado", closed: "Encerrado" };
export const advanceCloseLabels: Record<string, string> = { settled: "Prestado integralmente", returned: "Saldo devolvido pelo colaborador", discounted: "Saldo descontado do colaborador" };
