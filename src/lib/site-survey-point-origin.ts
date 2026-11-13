// Scope the historical import boundary to the visit whose original batch was verified.
export function addedAfterSurveyOriginalList(visitNumber: number | null, createdAt?: string | null) {
  return visitNumber === 202611100001 && Boolean(createdAt && Date.parse(createdAt) > Date.parse("2026-11-10T21:28:14.760965Z"));
}