import { z } from "zod";
export const proposedSolutionSchema = z.string().trim().max(4000);
export const codeObservationSchema = z.string().trim().min(1, "Digite uma observação.").max(4000);
export type CodeObservationLog = { id: string; observation_id: string | null; event_type: string | null; note: string | null; created_at: string; changed_by: string | null };
export function currentCodeObservations<T extends CodeObservationLog>(logs: T[]): T[] {
  const latest = new Map<string, T>();
  for (const log of [...logs].sort((a,b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))) {
    if (log.observation_id && ["observation_added", "observation_edited"].includes(log.event_type ?? "") && !latest.has(log.observation_id)) latest.set(log.observation_id, log);
  }
  return [...latest.values()];
}