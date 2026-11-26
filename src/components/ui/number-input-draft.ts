/** Incomplete numeric text stays in the field; only complete in-range values reach callers. */
export function numberInputDraftValue(text: string, min?: number, max?: number): number | null {
  if (!text.trim()) return null;
  const value = Number(text);
  return Number.isFinite(value) && (min === undefined || value >= min) && (max === undefined || value <= max) ? value : null;
}

export function finishNumberInputDraft(text: string, fallback: string, min?: number, max?: number): string {
  if (!text.trim() || !Number.isFinite(Number(text))) return fallback;
  return String(Math.max(min ?? -Infinity, Math.min(max ?? Infinity, Number(text))));
}