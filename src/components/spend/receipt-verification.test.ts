import { expect, it } from 'vitest';
import { receiptReading, receiptVerification } from './receipt-verification';

const expected = { amount: 60, date: '2026-11-24' };
it('nota de R$ 70 não pode ser vinculada à compra de R$ 60', () => {
  expect(receiptVerification({ ...expected, amount: 70, merchant: 'Madero' }, expected)).toEqual({ ok: false, amountMismatch: true, dateMismatch: false, missing: false });
  expect(receiptVerification({ ...expected, merchant: 'Madero' }, expected).ok).toBe(true);
});
it('conferência do anexo preserva o limite de dois dias da conciliação', () => {
  expect(receiptVerification({ ...expected, date: '2026-11-22', merchant: 'Madero' }, expected).ok).toBe(true);
  expect(receiptVerification({ ...expected, date: '2026-11-21', merchant: 'Madero' }, expected).dateMismatch).toBe(true);
});
it('sem leitura válida não libera a conferência do comprovante', () => {
  expect(receiptVerification(null, expected).ok).toBe(false);
  expect(receiptReading({ lancamentos: [] })).toBeNull();
  expect(receiptVerification({ amount: 60, date: 'ilegível', merchant: 'Madero' }, expected).ok).toBe(false);
});
it('não aceita arquivo contendo várias compras como uma única nota', () => {
  const item = { data: '2026-11-24', estabelecimento: 'Madero', valor: 60, parcela: null, final_cartao: null, categoria_sugerida: null, myio_cnpj: null };
  expect(receiptReading({ lancamentos: [item, item] })).toBeNull();
  expect(receiptReading({ lancamentos: [item] })?.amount).toBe(60);
});
it('nomes diferentes do estabelecimento não bloqueiam valor e data correspondentes', () => {
  const bank = { ...expected, merchant: 'MD*RESTAURANTE' };
  expect(receiptVerification({ ...expected, merchant: 'Madero Restaurante Ltda' }, bank).ok).toBe(true);
});