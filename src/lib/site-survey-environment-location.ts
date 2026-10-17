/** Physical location is user-entered; checklist classification is never a fallback. */
export function environmentLocation(value?: string | null): string | null {
  return value?.trim() || null;
}