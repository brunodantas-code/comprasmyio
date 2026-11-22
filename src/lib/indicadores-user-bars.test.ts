import { expect, it } from 'vitest';
import { indicadoresUserBars } from './indicadores-user-bars';
it('reúne todos os OKRs e KPIs por usuário sem duplicar objetivos por KR', () => {
  const rows = indicadoresUserBars([{id:'o',responsible_id:'u',source_metadata:null}], [
    {id:'kr1',objective_id:'o',responsible_id:'u',source_metadata:null,kind:'kr'},
    {id:'kr2',objective_id:'o',responsible_id:'u',source_metadata:null,kind:'kr'},
    {id:'kpi',objective_id:null,responsible_id:'u',source_metadata:null,kind:'kpi'},
  ], [{id:'u',full_name:'Bruno'}]);
  expect(rows[0]?.total).toBe(2);
  expect(rows[0]?.metricIds.size).toBe(3);
  expect(rows[0]?.name).toBe('Bruno');
});
it('mantém pessoas históricas sem atribuir suas metas a uma conta ERP', () => {
  const rows = indicadoresUserBars([], [{id:'kpi',objective_id:null,responsible_id:null,source_metadata:{responsible_name:'André'},kind:'kpi'}], [{id:'u',full_name:'Bruno'}]);
  expect(rows[0]?.id).toBe('historical:André');
  expect(rows[0]?.total).toBe(1);
});