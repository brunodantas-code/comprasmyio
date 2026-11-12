// Display correction confirmed by Leonardo: these dates had no technical visits.
// Keep stored records intact and do not suppress the same dates in other visits.
export function showsSurveyProgressDay(visitNumber: number, day: string): boolean {
  return visitNumber !== 202611100001 || (day !== "2026-11-10" && day !== "2026-11-11");
}

// The chart represents the assigned technician, not the user recording completion.
export function surveyProgressTechnicianId(responsibleId: string | null, recordedBy: string | null): string | null {
  return responsibleId || recordedBy;
}

export function surveyVisitTotals(points: Array<{ completion_status: string }>) {
  return {
    completed: points.filter((point) => point.completion_status === "concluida").length,
    remaining: points.filter((point) => point.completion_status !== "concluida" && point.completion_status !== "cancelada").length,
  };
}