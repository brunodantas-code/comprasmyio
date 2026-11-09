import { describe, expect, it } from 'vitest';
import { deadlineSignals, parseDeadlineAlerts, requestedDeadline, orderTiming, SUPPLY_CODE_MAX, type DeadlineOrder } from './supply-deadlines';
const order: DeadlineOrder = { id: '1', created_at: '2026-11-01T12:00:00Z', deadline_type: 'customizado', deadline_date: '2026-11-10', delivery_forecast: null, status: 'pendente' };
describe('Supply deadlines', () => {
  it('starts warning seven days before receipt', () => expect(deadlineSignals(order, undefined, '2026-11-03').purchaseAlert).toBe('warning'));
  it('starts critical alert three days before receipt', () => expect(deadlineSignals(order, undefined, '2026-11-07').purchaseAlert).toBe('critical'));
  it('does not warn eight days before', () => expect(deadlineSignals(order, undefined, '2026-11-02').purchaseAlert).toBeNull());
  it('stops purchase alert once purchased', () => expect(deadlineSignals({...order,status:'comprado_aguardando'}, undefined, '2026-11-07').purchaseAlert).toBeNull());
  it('flags purchased forecast later than receipt deadline', () => expect(deadlineSignals({...order,status:'comprado_aguardando',delivery_forecast:'2026-11-11'}, undefined, '2026-11-07').forecastLate).toBe(true));
  it('flags forecast passed without delivery', () => expect(deadlineSignals({...order,status:'comprado_aguardando',delivery_forecast:'2026-11-08'}, undefined, '2026-11-09').forecastOverdue).toBe(true));
  it('clears overdue delivery when delivered', () => expect(deadlineSignals({...order,status:'entregue',delivery_forecast:'2026-11-08'}, undefined, '2026-11-09').forecastOverdue).toBe(false));
  it('flags receipt deadline passed', () => expect(deadlineSignals(order, undefined, '2026-11-11').overdue).toBe(true));
  it('uses configurable thresholds', () => expect(deadlineSignals(order, {warningDays:9,criticalDays:5}, '2026-11-05').purchaseAlert).toBe('critical'));
  it('retains initial default values', () => expect(parseDeadlineAlerts()).toEqual({warningDays:7,criticalDays:3}));
  it('limits code to ten characters', () => expect(SUPPLY_CODE_MAX).toBe(10));
  it('resolves relative historical week from creation', () => expect(requestedDeadline({...order,deadline_date:null,deadline_type:'esta_semana',created_at:'2026-11-03'})).toBe('2026-11-08'));
  it('measures logged milestones without treating updates as delivery', () => {
    const result=orderTiming(order,[{order_id:'1',action:'status_alterado',details:{para:'comprado_aguardando'},created_at:'2026-11-06'}],[{order_id:'1',status:'aprovado',decided_at:'2026-11-04'}]);
    expect(result.requestToApproval).toBe(3); expect(result.approvalToPurchase).toBe(2); expect(result.delivered).toBeNull();
  });
});