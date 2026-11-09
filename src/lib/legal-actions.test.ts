import { describe, it, expect } from 'vitest';
import { actionsForSavedSubjects, legalActionSchema, legalObservationSchema, pendingLegalActions, legalActionDelayDays, canRemoveLegalObservation } from './legal-actions';
describe('ações dos assuntos',()=>{
 it('salva prazo por ação sem exigir alteração de ações antigas',()=>{
  const action = {title:'Contratar',responsible_id:'11111111-1111-4111-8111-111111111111'};
  expect(legalActionSchema.parse({...action,due_date:'2026-11-09'}).due_date).toBe('2026-11-09');
  expect(legalActionSchema.parse(action).due_date).toBeNull();
  expect(legalActionSchema.safeParse({...action,due_date:'2026-02-30'}).success).toBe(false);
 });
 it('indica atraso somente após o prazo enquanto a ação estiver aberta',()=>{
  expect(legalActionDelayDays({due_date:'2026-11-08',completed_at:null},'2026-11-09')).toBe(1);
  expect(legalActionDelayDays({due_date:'2026-11-09',completed_at:null},'2026-11-09')).toBe(0);
  expect(legalActionDelayDays({due_date:'2026-11-10',completed_at:null},'2026-11-09')).toBe(0);
  expect(legalActionDelayDays({due_date:null,completed_at:null},'2026-11-09')).toBe(0);
  expect(legalActionDelayDays({due_date:'2026-11-08',completed_at:'2026-11-09T10:00:00Z'},'2026-11-09')).toBe(0);
 });
 it('exclusão mantém a autorização de edição: somente o autor',()=>{
  expect(canRemoveLegalObservation('autor','autor')).toBe(true);
  expect(canRemoveLegalObservation('autor','outro')).toBe(false);
  expect(canRemoveLegalObservation('autor')).toBe(false);
 });
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