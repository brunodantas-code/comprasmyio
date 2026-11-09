import { detectButtonGroup, readButtonBindings } from './cde-look';

type Entry = { id?: string; tag: string; group: string; label: string; file: string; line: number; autoCdeSafe?: boolean };
type Standard = { group_key: string; variant_key: string; is_primary: boolean; screens: string[] | null };
type Model = { id: string };

export const libraryEntryKey = (entry: Entry) => entry.id ?? `${entry.file}|${entry.line}|${entry.label}`;

/** Fail closed: inventory presence and a chosen standard alone do not prove live wiring. */
export function canRetireLibraryEntry(entry: Entry, standards: Standard[], models: Model[]): boolean {
  const explicit = entry.tag === 'CdeButton' && !!entry.group;
  const bindings = readButtonBindings(standards.find(s => s.group_key === 'button_bindings' && s.is_primary)?.variant_key);
  const binding = (entry.id ? bindings[entry.id] : undefined) ?? bindings[entry.label];
  if (entry.id && binding?.modelKey) return !binding.modelKey.startsWith('custom:') || models.some(m => m.id === binding.modelKey?.slice(7));
  const group = binding?.group || (explicit ? entry.group : detectButtonGroup(entry.label));
  if (entry.id && binding && group) {
    const row = standards.find(s => s.group_key === group && s.is_primary);
    return !!row && (!row.variant_key.startsWith('custom:') || models.some(m => m.id === row.variant_key.slice(7)));
  }
  if (!group || (!explicit && (entry.tag !== 'Button' || !entry.autoCdeSafe))) return false;
  const row = (explicit && standards.find(s => s.group_key === group && !s.is_primary && s.screens?.includes(entry.file))) || standards.find(s => s.group_key === group && s.is_primary);
  if (!row) return false;
  return !row.variant_key.startsWith('custom:') || models.some(m => m.id === row.variant_key.slice(7));
}

export function readRetiredEntries(raw?: string): string[] {
  try { const value: unknown = JSON.parse(raw ?? '[]'); return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []; } catch { return []; }
}