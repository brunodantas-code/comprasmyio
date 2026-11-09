import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
export const legalActionSchema = z.object({ title: z.string().trim().min(1).max(1000), responsible_id: z.string().uuid() });
export const legalObservationSchema = z.string().trim().min(1).max(4000);
export type DraftLegalAction = { id: string; subject_id: string; title: string; responsible_id: string; responsible_name: string };
export function actionsForSavedSubjects(actions: DraftLegalAction[], subjectIds: string[]) {
  const ids = new Set(subjectIds);
  return actions.filter(action => ids.has(action.subject_id));
}
export const legalTrackingOptions = queryOptions({ queryKey: ['legal-tracking'], queryFn: async () => {
  const [actions, observations, logs, users] = await Promise.all([
    supabase.from('legal_actions').select('*').order('sequence'),
    supabase.from('legal_action_observations').select('*').order('created_at'),
    supabase.from('legal_subject_logs').select('*').order('created_at'),
    supabase.rpc('legal_participant_users'),
  ]);
  for (const result of [actions, observations, logs, users]) if (result.error) throw result.error;
  return { actions: actions.data ?? [], observations: observations.data ?? [], logs: logs.data ?? [], users: users.data ?? [] };
} });
export function pendingLegalActions(actions: { completed_at: string | null; archived: boolean }[]) {
  return actions.filter(a => !a.archived && !a.completed_at).length;
}