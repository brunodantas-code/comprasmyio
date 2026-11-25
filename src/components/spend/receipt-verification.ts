import { canMatch, type Extracted } from './rules';
import type { SpendData } from './data';

export type ReceiptReading = { amount: number; date: string; merchant: string };
export function receiptReading(result: Extracted): ReceiptReading | null {
  const item = result.lancamentos.length === 1 ? result.lancamentos[0] : undefined;
  return item && Number.isFinite(item.valor) && item.valor > 0 ? { amount: item.valor, date: item.data, merchant: item.estabelecimento } : null;
}

export function receiptVerification(reading: ReceiptReading | null, expected: { amount: number; date: string }) {
  if (!reading) return { ok: false, amountMismatch: false, dateMismatch: false, missing: true };
  const amountMismatch = Math.round(reading.amount * 100) !== Math.round(expected.amount * 100);
  const days = Math.abs(Date.parse(`${reading.date}T00:00:00Z`) - Date.parse(`${expected.date}T00:00:00Z`)) / 86400000;
  const dateMismatch = !Number.isFinite(days) || days > 2;
  return { ok: !amountMismatch && !dateMismatch, amountMismatch, dateMismatch, missing: false };
}

export async function prepareSpendMatches(data: SpendData, statementId: string, read: (path: string) => Promise<Extracted>) {
  const statement = data.statements.find(s => s.id === statementId);
  const card = data.cards.find(c => c.id === statement?.card_id);
  if (!card) throw new Error('Cartão não encontrado');
  const lines = data.lines.filter(l => l.statement_id === statementId && !l.receipt_id && !l.receipt_not_applicable && l.status === 'pending');
  let skipped = 0;
  for (const receipt of data.receipts.filter(r => r.card_id === card.id && r.status === 'pending' && !data.lines.some(l => l.receipt_id === r.id))) {
    const candidates = lines.filter(l => canMatch({ card_id: card.id, date: l.date, amount: l.amount, final_cartao: l.last_four ?? '' }, { card_id: receipt.card_id ?? '', date: receipt.date, amount: receipt.amount, final_cartao: card.last_four, payment_source: receipt.payment_source }));
    if (!candidates.length) continue;
    try {
      const reading = receiptReading(await read(receipt.file_path));
      if (!receiptVerification(reading, receipt).ok || !candidates.some(l => receiptVerification(reading, l).ok)) skipped++;
    } catch { skipped++; }
  }
  return skipped;
}