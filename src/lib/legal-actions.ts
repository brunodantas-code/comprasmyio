import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
export const legalActionSchema = z.object({ title: z.string().trim().min(1).max(1000), responsible_id: z.string().uuid(), due_date: z.preprocess(value => value === '' || value === undefined ? null : value, z.string().date().nullable()) });
export const legalObservationSchema = z.string().trim().min(1).max(4000);
export type DraftLegalAction = { id: string; subject_id: string; title: string; responsible_id: string; responsible_name: string; due_date?: string | null };
export function legalActionDelayDays(action: { due_date?: string | null; completed_at: string | null }, today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })) {
  if (!action.due_date || action.completed_at) return 0;
  return Math.max(0, Math.round((Date.parse(today) - Date.parse(action.due_date)) / 86400000));
}
/** Days until due when inside the CDE warning window (0 = due today); null when not alerting. */
export function legalActionDueSoonDays(action: { due_date?: string | null; completed_at: string | null }, warningDays: number, today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })) {
  if (!action.due_date || action.completed_at) return null;
  const left = Math.round((Date.parse(action.due_date) - Date.parse(today)) / 86400000);
  return left >= 0 && left <= warningDays ? left : null;
}
export function canRemoveLegalObservation(authorId: string, userId?: string) {
  return Boolean(userId && authorId === userId);
}
export function actionsForSavedSubjects(actions: DraftLegalAction[], subjectIds: string[]) {
  const ids = new Set(subjectIds);
  return actions.filter(action => ids.has(action.subject_id));
}
export const legalTrackingOptions = queryOptions({ queryKey: ['legal-tracking'], queryFn: async () => {
  const [actions, observations, logs, users, completions] = await Promise.all([
    supabase.from('legal_actions').select('*').order('sequence'),
    supabase.from('legal_action_observations').select('*').is('deleted_at', null).order('created_at'),
    supabase.from('legal_subject_logs').select('*').order('created_at'),
    supabase.rpc('legal_participant_users'),
    supabase.from('legal_subject_completions').select('*'),
  ]);
  for (const result of [actions, observations, logs, users, completions]) if (result.error) throw result.error;
  return { actions: actions.data ?? [], observations: observations.data ?? [], logs: logs.data ?? [], users: users.data ?? [], completions: completions.data ?? [] };
} });
export function pendingLegalActions(actions: { completed_at: string | null; archived: boolean }[]) {
  return actions.filter(a => !a.archived && !a.completed_at).length;
}