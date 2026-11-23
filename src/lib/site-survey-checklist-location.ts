type LocationQuestion = { id: string; section_id: string; prompt: string };
type LocationResponse = { question_id: string; visit_luc_id: string | null; visit_environment_id: string | null; answer: unknown };

/** Display-only technical location; physical registration fields remain unchanged. */
export function checklistElectricalLocation(point: { id: string; source: "luc" | "environment"; template_id: string | null }, data: { questions: LocationQuestion[]; sections: { id: string; template_id: string }[]; responses: LocationResponse[] }): string {
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
  const sectionIds = new Set(data.sections.filter((section) => section.template_id === point.template_id).map((section) => section.id));
  const candidates = data.questions.filter((question) => normalize(question.prompt).replace(/\?$/, "") === "onde se encontra o quadro eletrico").sort((a, b) => Number(sectionIds.has(b.section_id)) - Number(sectionIds.has(a.section_id)));
  for (const question of candidates) {
    const response = data.responses.find((row) => row.question_id === question.id && (point.source === "luc" ? row.visit_luc_id === point.id : row.visit_environment_id === point.id));
    const answer = response?.answer;
    const value = answer && typeof answer === "object" && "value" in answer ? answer.value : answer;
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}