import { describe, expect, it } from 'vitest';
import { spendPendingAdjustments, type SpendAdjustment } from './pending';
const request: SpendAdjustment = { line_id:'line', receipt_id:'receipt', card_id:'card', holder_id:'portador', merchant:'Hotel', amount:139.90, date:'2026-10-08', status:'adjustment', message:'Confira o comprovante', requested_at:'2026-11-24T23:00:00Z', corrected_at:null, requester_name:'Financeiro' };
describe('Spend adjustment pendencies', () => {
  it('includes a holder notification, including self-notification', () => {
    expect(spendPendingAdjustments([{...request,receipt_id:null,kind:'notify'}],'portador')).toHaveLength(1);
  });
  it('assigns the adjustment to the holder, not another user', () => {
    expect(spendPendingAdjustments([request], 'portador')).toHaveLength(1);
    expect(spendPendingAdjustments([request], 'financeiro')).toHaveLength(0);
  });
  it('counts repeated requests once per line, retaining the latest', () => {
    expect(spendPendingAdjustments([request, {...request, requested_at:'2026-11-24T23:01:00Z'}])).toEqual([{...request, requested_at:'2026-11-24T23:01:00Z'}]);
  });
  it('removes a pending request only after an audited saved correction', () => {
    expect(spendPendingAdjustments([request])).toHaveLength(1);
    expect(spendPendingAdjustments([{...request, corrected_at:'2026-11-24T23:02:00Z'}])).toHaveLength(0);
    expect(spendPendingAdjustments([{...request, corrected_at:'2026-11-24T22:59:00Z'}])).toHaveLength(1);
  });
  it('excludes approved and newly linked lines', () => {
    expect(spendPendingAdjustments([{...request,status:'approved'},{...request,line_id:'other',status:'matched'}])).toHaveLength(0);
  });
  it('a new request after the correction becomes pending again', () => {
    expect(spendPendingAdjustments([{...request, corrected_at:'2026-11-24T23:02:00Z',requested_at:'2026-11-24T23:03:00Z'}])).toHaveLength(1);
  });
});