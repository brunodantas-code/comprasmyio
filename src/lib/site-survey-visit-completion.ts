export function canCompleteSurveyVisit(status: string) {
  return status === "em_andamento" || status === "em_revisao";
}

export function surveyVisitCompletionTime(date: string, time: string, startedAt: string | null, completedAt: string | null, now = new Date()) {
  if (completedAt) return completedAt;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error("Informe a data e o horário reais do encerramento.");
  const end = new Date(`${date}T${time}:00`);
  if (!Number.isFinite(end.getTime()) || end.getTime() > now.getTime()) throw new Error("O encerramento deve ser uma data e horário válidos, não futuros.");
  if (startedAt && end.getTime() < new Date(startedAt).getTime()) throw new Error("O encerramento não pode ser anterior ao início registrado da visita.");
  return end.toISOString();
}