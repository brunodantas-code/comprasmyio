import { describe, expect, it } from 'vitest';
import { competenceLines, monthOptions, statementMonth } from './period-filters';

const statements = [
  { id: 'oct', card_id: '8991', period: '2026-10-01', due_date: '2026-10-26' },
  { id: 'nov', card_id: '8991', period: '2026-11-01', due_date: '2026-11-26' },
  { id: 'other', card_id: 'other-card', period: '2026-10-01', due_date: '2026-10-26' },
];
const lines = [
  { id: 'september', statement_id: 'oct', date: '2026-09-30' },
  { id: 'october-next-invoice', statement_id: 'nov', date: '2026-10-29' },
  { id: 'october', statement_id: 'oct', date: '2026-10-02' },
  { id: 'other', statement_id: 'other', date: '2026-10-02' },
];
describe('vencimento e competência independentes', () => {
  it('organiza a fatura vencida em 26/10 no mês 10, não no mês de importação', () => {
    expect(statementMonth({ id: 'oct', card_id: '8991', period: '2026-11-01', due_date: '2026-10-26' })).toBe('2026-10');
  });
  it('competência outubro inclui gastos de outubro em faturas de outubro e novembro', () => {
    expect(competenceLines(lines, statements, '8991', 'oct', '2026-10').map(line => line.id)).toEqual(['october', 'october-next-invoice']);
  });
  it('setembro usa a data do gasto, apesar de a fatura vencer em outubro', () => {
    expect(competenceLines(lines, statements, '8991', 'nov', '2026-09').map(line => line.id)).toEqual(['september']);
  });
  it('todas as competências mostram todos os gastos do cartão ordenados por data', () => {
    expect(competenceLines(lines, statements, '8991', undefined, 'all').map(line => line.id)).toEqual(['september', 'october', 'october-next-invoice']);
  });
  it('modo fatura mantém somente a fatura selecionada', () => {
    expect(competenceLines(lines, statements, '8991', 'oct', 'statement').map(line => line.id)).toEqual(['september', 'october']);
  });
  it('opções de mês e ano são únicas e ordenadas', () => {
    expect(monthOptions(['2026-10-26', '2026-10', '2026-11-01', 'inválido'])).toEqual([{ value: '2026-11', label: '11/2026' }, { value: '2026-10', label: '10/2026' }]);
  });
});