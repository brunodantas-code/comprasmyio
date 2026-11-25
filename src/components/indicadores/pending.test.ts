import { describe, expect, it } from 'vitest';
import { indicadoresPendingKrs, indicadoresPendingReason } from './pending';
const row = { metric_id:'m', title:'KR', objective_title:null, responsible_id:'andre', due_on:'2026-11-01', last_checkin:'2026-11-20', overdue:true, stale:false };
describe('pendências de KR', () => {
  it('prazo vencido aparece para o responsável', () => expect(indicadoresPendingKrs([row],'andre')).toHaveLength(1));
  it('não aparece para outra pessoa', () => expect(indicadoresPendingKrs([row],'leo')).toHaveLength(0));
  it('os dois motivos são mostrados juntos', () => expect(indicadoresPendingReason({...row,stale:true})).toBe('Prazo do KR vencido · Check-in semanal atrasado'));
});
