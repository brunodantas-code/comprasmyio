/** Persisted values, not view/filter state, determine whether Save is enabled. */
export function cdeDraftChanged(value: unknown, initial: unknown): boolean {
  return JSON.stringify(value) !== JSON.stringify(initial);
}