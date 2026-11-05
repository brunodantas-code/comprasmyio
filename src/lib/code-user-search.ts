import { filterOptions, normalizeSearch, type SearchableOption } from '@/components/ui/searchable-select';

function nearWord(a: string, b: string) {
  if (a.length < 4 || Math.abs(a.length - b.length) > 1) return false;
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = previous[j];
      previous[j] = Math.min(above + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[b.length] <= 1;
}

export function filterCodeUsers(options: SearchableOption[], query: string) {
  const exact = filterOptions(options, query);
  const ids = new Set(exact.map(o => o.value));
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!words.length) return exact;
  return [...exact, ...options.filter(o => !ids.has(o.value) && words.every(w => {
    const tokens = normalizeSearch(`${o.label} ${o.hint ?? ''}`).split(/[\s@._-]+/);
    return tokens.some(t => t.includes(w) || nearWord(w, t));
  }))];
}