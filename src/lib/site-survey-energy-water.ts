type Question = { id: string; prompt: string };
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
const selectedValue = (answer: unknown): unknown => {
  if (answer && typeof answer === "object" && !Array.isArray(answer) && "value" in answer) return selectedValue((answer as { value: unknown }).value);
  return answer;
};
const isAffirmative = (answer: unknown) => selectedValue(answer) === true || String(selectedValue(answer) ?? "").trim().toLocaleLowerCase("pt-BR") === "sim";

export type EnergyWaterKind = "water" | "energy" | "both";
export type EnergyWaterTotals = { water: number; energy: number; both: number; waterAll: number; energyAll: number };

/** Classifica o ponto pelo checklist: hidrômetro presente ("Existe hidrômetro…") e ponto de elétrica próximo. */
export function classifyPointEnergyWater(answers: Map<string, unknown>, questions: Question[]): EnergyWaterKind | null {
  const hasWater = questions.some((question) => /existe hidrometro/.test(normalize(question.prompt)) && isAffirmative(answers.get(question.id)));
  const hasEnergy = questions.some((question) => /existe ponto de eletrica? proximo/.test(normalize(question.prompt)) && isAffirmative(answers.get(question.id)));
  if (hasWater && hasEnergy) return "both";
  if (hasWater) return "water";
  if (hasEnergy) return "energy";
  return null;
}

export function energyWaterTotals(points: { kind: string; id: string; pointType: string; completionStatus: string }[], responses: { visit_luc_id?: string | null; visit_environment_id?: string | null; question_id: string; answer: unknown }[], questions: Question[]): EnergyWaterTotals {
  const totals: EnergyWaterTotals = { water: 0, energy: 0, both: 0, waterAll: 0, energyAll: 0 };
  for (const point of points) {
    if (point.pointType === "vacant" || point.completionStatus === "cancelada") continue;
    const scope = (item: { visit_luc_id?: string | null; visit_environment_id?: string | null }) => point.kind === "luc" ? item.visit_luc_id === point.id : item.visit_environment_id === point.id;
    const answers = new Map(responses.filter(scope).map((item) => [item.question_id, item.answer]));
    const classification = classifyPointEnergyWater(answers, questions);
    if (classification === "water") { totals.water += 1; totals.waterAll += 1; }
    else if (classification === "energy") { totals.energy += 1; totals.energyAll += 1; }
    else if (classification === "both") { totals.both += 1; totals.waterAll += 1; totals.energyAll += 1; }
  }
  return totals;
}

// Totals from the "Instalação aprovada" checkboxes: hydraulic = água, electrical = energia.
// waterAll/energyAll contam qualquer ponto aprovado no serviço, incluindo os dois aprovados (Água + Energia).
export function approvalEnergyWaterTotals(approvals: Array<{ point_kind: string; point_id: string; hydraulic_approved: boolean; electrical_approved: boolean }>, pointKeys: Set<string>): EnergyWaterTotals {
  const totals: EnergyWaterTotals = { water: 0, energy: 0, both: 0, waterAll: 0, energyAll: 0 };
  for (const a of approvals) {
    if (!pointKeys.has(`${a.point_kind}:${a.point_id}`)) continue;
    if (a.hydraulic_approved) totals.waterAll++;
    if (a.electrical_approved) totals.energyAll++;
    if (a.hydraulic_approved && a.electrical_approved) totals.both++;
    else if (a.hydraulic_approved) totals.water++;
    else if (a.electrical_approved) totals.energy++;
  }
  return totals;
}
