export type FilterSection = { id: string; template_id: string; title: string; position: number; active: boolean };
export type FilterQuestion = { id: string; section_id: string; prompt: string; position: number; active: boolean; question_type: string; options: unknown; configuration: unknown; conditioned_on_question_id?: string | null; conditioned_operator?: string; conditioned_value?: string | null };
export type FilterResponse = { question_id: string; visit_luc_id: string | null; visit_environment_id: string | null; answer: unknown };
export type GeneralFilterData = { sections: FilterSection[]; questions: FilterQuestion[]; responses: FilterResponse[]; visitTemplateId: string | null; pointTemplateIds?: (string | null)[] };
export type FilterField = { key: string; section: string; prompt: string; label: string; path: string; questionIds: string[]; options: string[]; numeric: boolean };
export type FilterRule = { values: string[]; operator?: "contains" | "lte" | "gte" | "equals"; text?: string };
export type GeneralFilter = { mode: "all" | "any"; rules: Record<string, FilterRule> };
export const emptyGeneralFilter = (): GeneralFilter => ({ mode: "all", rules: {} });
const normalize = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const strings = (value: unknown): string[] => Array.isArray(value) ? value.flatMap(strings) : typeof value === "boolean" ? [value ? "Sim" : "Não"] : typeof value === "string" || typeof value === "number" ? [String(value)].filter((v) => v.trim()) : [];
export const activeFilterRules = (filter: GeneralFilter) => Object.entries(filter.rules).filter(([, rule]) => rule.values.length > 0 || Boolean(rule.text?.trim()));
function answerField(answer: unknown, path: string): string[] {
  const object = record(answer);
  if (path === "detail" || path === "subdetail") return strings(typeof object.detail === "string" ? object.detail.split(" | ")[path === "detail" ? 0 : 1] : object[path]);
  return strings(path === "value" ? ("value" in object ? object.value : answer) : object[path]);
}
const EXCLUDED_SECTIONS = ["diversos", "check list de preparacao", "checklist de preparacao", "equipe", "condicoes do local", "revisao, pendencias, fotos e encerramento", "observacoes finais e fotos adicionais"];
const excludedQuestion = (prompt: string) => { const p = normalize(prompt); return p.includes("cisterna") || p.startsWith("qual a dificuldade de acesso ao hidrometro"); };
// Hydrometer questions stored under "Tipo" are shown with "Água e hidrômetros".
const filterSectionTitle = (title: string, prompt: string) => normalize(title) === "tipo" && normalize(prompt).includes("hidrometro") ? "Água e hidrômetros" : title;
export function generalFilterFields(data: GeneralFilterData): FilterField[] {
  const fields = new Map<string, FilterField>();
  const sortIndex = new Map<string, number>();
  for (const section of data.sections.filter((s) => s.active && !EXCLUDED_SECTIONS.includes(normalize(s.title)) && [data.visitTemplateId, ...(data.pointTemplateIds ?? [])].includes(s.template_id)).sort((a, b) => a.position - b.position)) {
    for (const q of data.questions.filter((q) => q.active && q.section_id === section.id && !excludedQuestion(q.prompt)).sort((a, b) => a.position - b.position)) {
      const config = record(q.configuration), detail = record(config.detail);
      const sectionTitle = filterSectionTitle(section.title, q.prompt);
      const paths = [{ path: "value", label: q.prompt, options: q.options, numeric: q.question_type === "number" }, ...(Object.keys(detail).length ? [{ path: "detail", label: String(detail.label || "Detalhes"), options: detail.options, numeric: false }] : []), ...(detail.suboptions ? [{ path: "subdetail", label: "Complemento", options: Object.values(record(detail.suboptions)).flat(), numeric: false }] : [])];
      for (const [index, item] of paths.entries()) {
        const key = `${normalize(sectionTitle)}|${normalize(q.prompt)}|${item.path}`;
        const field = fields.get(key) ?? { key, section: sectionTitle, prompt: q.prompt, label: item.label, path: item.path, questionIds: [], options: [], numeric: item.numeric };
        field.questionIds.push(q.id);
        if (!sortIndex.has(key) || sortIndex.get(key)! > section.position * 100000 + q.position * 10 + index) sortIndex.set(key, section.position * 100000 + q.position * 10 + index);
        const observed = data.responses.filter((r) => r.question_id === q.id).flatMap((r) => answerField(r.answer, item.path));
        field.options = [...new Set([...field.options, ...strings(item.options), ...(q.question_type === "checkbox" && item.path === "value" ? ["Sim", "Não"] : []), ...observed])];
        fields.set(key, field);
      }
    }
  }
  const sectionOrder: string[] = [];
  for (const field of fields.values()) if (!sectionOrder.includes(field.section)) sectionOrder.push(field.section);
  return sectionOrder.flatMap((section) => [...fields.values()].filter((f) => f.section === section).sort((a, b) => (sortIndex.get(a.key) ?? 0) - (sortIndex.get(b.key) ?? 0)));
}
function ruleMatches(values: string[], rule: FilterRule): boolean {
  const optionsMatch = rule.values.length === 0 || values.some((v) => rule.values.some((selected) => normalize(v) === normalize(selected)));
  if (!optionsMatch) return false;
  if (!rule.text?.trim()) return values.length > 0;
  if (!rule.operator || rule.operator === "contains") return values.some((v) => normalize(v).includes(normalize(rule.text)));
  const number = Number(rule.text.replace(",", "."));
  if (!Number.isFinite(number)) return false;
  return values.some((v) => { const n = Number(v.trim().replace(",", ".")); return v.trim() !== "" && Number.isFinite(n) && (rule.operator === "lte" ? n <= number : rule.operator === "gte" ? n >= number : n === number); });
}
export function matchesGeneralFilter(point: { id: string; source: "luc" | "environment"; template_id?: string | null }, data: GeneralFilterData, fields: FilterField[], filter: GeneralFilter): boolean {
  const rules = activeFilterRules(filter);
  if (!rules.length) return true;
  const sectionIds = new Set(data.sections.filter((s) => s.active && s.template_id === (point.template_id ?? data.visitTemplateId)).map((s) => s.id));
  const pointResponses = data.responses.filter((r) => point.source === "luc" ? r.visit_luc_id === point.id : r.visit_environment_id === point.id);
  const generalResponses = data.responses.filter((r) => !r.visit_luc_id && !r.visit_environment_id);
  const responseFor = (id: string) => pointResponses.find((r) => r.question_id === id) ?? generalResponses.find((r) => r.question_id === id);
  const visible = (q: FilterQuestion, visited = new Set<string>()): boolean => {
    if (!q.conditioned_on_question_id || !q.conditioned_value) return true;
    if (visited.has(q.id)) return false;
    visited.add(q.id);
    const parent = data.questions.find((p) => p.id === q.conditioned_on_question_id);
    if (!parent || !visible(parent, visited)) return false;
    const values = answerField(responseFor(parent.id)?.answer, "value");
    const equals = values.some((v) => q.conditioned_value?.split(";").some((expected) => normalize(v) === normalize(expected)) || (v === "Sim" && q.conditioned_value === "true") || (v === "Não" && q.conditioned_value === "false"));
    return q.conditioned_operator === "not_equals" ? !equals : equals;
  };
  const matches = rules.map(([key, rule]) => {
    const field = fields.find((f) => f.key === key);
    if (!field) return false;
    return field.questionIds.some((id) => { const q = data.questions.find((q) => q.id === id); return Boolean(q && q.active && sectionIds.has(q.section_id) && visible(q) && ruleMatches(answerField(responseFor(id)?.answer, field.path), rule)); });
  });
  return filter.mode === "any" ? matches.some(Boolean) : matches.every(Boolean);
}