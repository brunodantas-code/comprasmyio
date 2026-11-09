import { describe, it, expect } from 'vitest';
import { actionsForSavedSubjects, legalActionSchema, legalObservationSchema, pendingLegalActions } from './legal-actions';
describe('ações dos assuntos',()=>{
 it('mantém ações de assunto novo para salvar junto à ata e descarta assuntos retirados',()=>{
  const action = {id:'a',subject_id:'novo',title:'Contratar',responsible_id:'11111111-1111-4111-8111-111111111111',responsible_name:'Responsável'};
  expect(actionsForSavedSubjects([action],['novo'])).toEqual([action]);
  expect(actionsForSavedSubjects([action],['outro'])).toEqual([]);
 });
 it('cada ação exige texto e responsável',()=>{
  expect(legalActionSchema.safeParse({title:'Contratar',responsible_id:''}).success).toBe(false);
  expect(legalActionSchema.safeParse({title:'',responsible_id:'11111111-1111-4111-8111-111111111111'}).success).toBe(false);
  expect(legalActionSchema.safeParse({title:'Contratar',responsible_id:'11111111-1111-4111-8111-111111111111'}).success).toBe(true);
 });
 it('concluir uma ação retira sua pendência',()=>{
  expect(pendingLegalActions([{completed_at:null,archived:false},{completed_at:'2026-11-09T03:35:00Z',archived:false}])).toBe(1);
  expect(pendingLegalActions([{completed_at:'2026-11-09T03:35:00Z',archived:false}])).toBe(0);
 });
 it('observações exigem conteúdo e têm limite',()=>{
  expect(legalObservationSchema.safeParse(' ').success).toBe(false);
  expect(legalObservationSchema.safeParse('Informação da ação').success).toBe(true);
  expect(legalObservationSchema.safeParse('x'.repeat(4001)).success).toBe(false);
 });
});