import { describe, expect, it } from 'vitest';
import { canDeclareMissingReceipt, missingReceiptDeclaration, missingReceiptLabels, missingReceiptReason } from './missing-receipt';
describe('missing receipt declarations', () => {
  it('allows a holder to answer an adjustment without a receipt', () => {
    expect(canDeclareMissingReceipt('holder','holder',null,'adjustment')).toBe(true);
    expect(canDeclareMissingReceipt('holder','finance',null,'adjustment')).toBe(false);
  });
  it('does not allow declarations for attached or approved receipts', () => {
    expect(canDeclareMissingReceipt('holder','holder','receipt','adjustment')).toBe(false);
    expect(canDeclareMissingReceipt('holder','holder',null,'approved')).toBe(false);
  });
  it('lets the holder declare only a lost receipt', () => {
    expect(missingReceiptDeclaration.safeParse('lost').success).toBe(true);
    expect(missingReceiptDeclaration.safeParse('not_applicable').success).toBe(false);
    expect(missingReceiptDeclaration.safeParse('approved').success).toBe(false);
  });
  it('keeps older not-applicable answers readable in history', () => {
    expect(missingReceiptReason.safeParse('not_applicable').success).toBe(true);
    expect(missingReceiptLabels.not_applicable).toBe('Não se aplica');
    expect(missingReceiptLabels.lost).toBe('Não salvei ou perdi o comprovante');
  });
});
