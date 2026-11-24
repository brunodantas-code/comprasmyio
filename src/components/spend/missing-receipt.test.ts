import { describe, expect, it } from 'vitest';
import { canDeclareMissingReceipt, missingReceiptReason } from './missing-receipt';
describe('missing receipt declarations', () => {
  it('allows a holder to answer an adjustment without a receipt', () => {
    expect(canDeclareMissingReceipt('holder','holder',null,'adjustment')).toBe(true);
    expect(canDeclareMissingReceipt('holder','finance',null,'adjustment')).toBe(false);
  });
  it('does not allow declarations for attached or approved receipts', () => {
    expect(canDeclareMissingReceipt('holder','holder','receipt','adjustment')).toBe(false);
    expect(canDeclareMissingReceipt('holder','holder',null,'approved')).toBe(false);
  });
  it('accepts only lost and not-applicable declarations', () => {
    expect(missingReceiptReason.safeParse('lost').success).toBe(true);
    expect(missingReceiptReason.safeParse('not_applicable').success).toBe(true);
    expect(missingReceiptReason.safeParse('approved').success).toBe(false);
  });
});