import type { Json } from '@/integrations/supabase/types';

type Revision = { id: string; action: string; created_at: string; details: Json };
export function lineDetails(line: { id: string; merchant: string }, logs: Revision[]) {
  const revision = logs.filter(log => log.action === 'line_description_edited' && log.details && typeof log.details === 'object' && !Array.isArray(log.details) && log.details['line_id'] === line.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))[0];
  const details = revision?.details;
  const value = details && typeof details === 'object' && !Array.isArray(details) ? details : {};
  return {
    display_description: typeof value['description'] === 'string' && value['description'].trim() ? value['description'] : line.merchant,
    additional_observation: typeof value['observation'] === 'string' ? value['observation'] : '',
    description_revision: revision?.id ?? null,
  };
}