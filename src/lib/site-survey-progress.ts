// Display correction confirmed by Leonardo: these dates had no technical visits.
// Keep stored records intact and do not suppress the same dates in other visits.
export function showsSurveyProgressDay(visitNumber: number, day: string): boolean {
  return visitNumber !== 202611100001 || (day !== "2026-11-10" && day !== "2026-11-11");
}