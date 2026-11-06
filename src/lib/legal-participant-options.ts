import { filterOptions, normalizeSearch, type SearchableOption } from '@/components/ui/searchable-select';

export function legalParticipantOptions(options: SearchableOption[], query: string): SearchableOption[] {
  const results = filterOptions(options, query);
  const name = query.trim();
  if (name && !options.some(option => normalizeSearch(option.label) === normalizeSearch(name))) {
    results.push({ value: name, label: name, hint: 'Adicionar participante externo' });
  }
  return results;
}