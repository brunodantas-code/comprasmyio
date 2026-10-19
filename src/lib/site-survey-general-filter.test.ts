import { describe, expect, it } from "vitest";
import { generalFilterFields, matchesGeneralFilter, type GeneralFilterData, type GeneralFilter } from "./site-survey-general-filter";
const data: GeneralFilterData = {
  visitTemplateId: "shopping", sections: [{ id: "water", template_id: "shopping", title: "Água", position: 1, active: true }, { id: "energy", template_id: "shopping", title: "Energia", position: 2, active: true }],
  questions: [{ id: "flow", section_id: "water", prompt: "Vazão", question_type: "radio", position: 1, active: true, options: ["Até 10 m³/h", "Acima de 10 m³/h"], configuration: {} }, { id: "cable", section_id: "energy", prompt: "Bitola do cabo", question_type: "number", position: 1, active: true, options: [], configuration: {} }],
  responses: [{ question_id: "flow", visit_luc_id: "shop", visit_environment_id: null, answer: { value: "Até 10 m³/h" } }, { question_id: "cable", visit_luc_id: "shop", visit_environment_id: null, answer: { value: "16" } }, { question_id: "flow", visit_luc_id: null, visit_environment_id: "env", answer: "Acima de 10 m³/h" }, { question_id: "cable", visit_luc_id: null, visit_environment_id: "env", answer: "17" }],
};
const fields = generalFilterFields(data);
const flowKey = fields[0].key, cableKey = fields[1].key;
describe("filtro geral do Cadastro", () => {
  it("respeita a condição da pergunta com resposta simples ou estruturada", () => {
    const conditional: GeneralFilterData = { ...data, questions: [{ ...data.questions[0], conditioned_on_question_id: "exists", conditioned_value: "Sim" }, { ...data.questions[0], id: "exists", prompt: "Existe hidrômetro?" }], responses: [...data.responses, { question_id: "exists", visit_luc_id: "shop", visit_environment_id: null, answer: "Sim" }, { question_id: "exists", visit_luc_id: null, visit_environment_id: "env", answer: { value: "Não" } }] };
    const filter: GeneralFilter = { mode: "all", rules: { [flowKey]: { values: ["Até 10 m³/h", "Acima de 10 m³/h"] } } };
    expect(matchesGeneralFilter({ id: "shop", source: "luc" }, conditional, generalFilterFields(conditional), filter)).toBe(true);
    expect(matchesGeneralFilter({ id: "env", source: "environment" }, conditional, generalFilterFields(conditional), filter)).toBe(false);
  });
  it("seleciona hidrômetros até 10 m³/h por opção, sem incluir acima de 10", () => {
    const filter: GeneralFilter = { mode: "all", rules: { [flowKey]: { values: ["Até 10 m³/h"] } } };
    expect(matchesGeneralFilter({ id: "shop", source: "luc" }, data, fields, filter)).toBe(true);
    expect(matchesGeneralFilter({ id: "env", source: "environment" }, data, fields, filter)).toBe(false);
  });
  it("bitola até 16 inclui 16 e exclui 17", () => {
    const filter: GeneralFilter = { mode: "all", rules: { [cableKey]: { values: [], operator: "lte", text: "16" } } };
    expect(matchesGeneralFilter({ id: "shop", source: "luc" }, data, fields, filter)).toBe(true);
    expect(matchesGeneralFilter({ id: "env", source: "environment" }, data, fields, filter)).toBe(false);
  });
  it("combina perguntas com todas ou qualquer e opções da mesma pergunta com OU", () => {
    const filter: GeneralFilter = { mode: "all", rules: { [flowKey]: { values: ["Até 10 m³/h", "Acima de 10 m³/h"] }, [cableKey]: { values: [], operator: "lte", text: "16" } } };
    expect(matchesGeneralFilter({ id: "env", source: "environment" }, data, fields, filter)).toBe(false);
    expect(matchesGeneralFilter({ id: "env", source: "environment" }, data, fields, { ...filter, mode: "any" })).toBe(true);
  });
  it("não mistura respostas de lojas e ambientes nem inclui pontos sem resposta", () => {
    expect(matchesGeneralFilter({ id: "missing", source: "luc" }, data, fields, { mode: "all", rules: { [flowKey]: { values: ["Até 10 m³/h"] } } })).toBe(false);
  });
  it("separa detalhes e complemento armazenados juntos", () => {
    const detailData = { ...data, questions: [{ ...data.questions[0], configuration: { detail: { label: "Vazão", options: ["Até 10"], suboptions: { "Até 10": ["Sala"] } } } }], responses: [{ ...data.responses[0], answer: { value: "Sim", detail: "Até 10 | Sala" } }] };
    const detailFields = generalFilterFields(detailData);
    const key = detailFields.find((f) => f.path === "detail")?.key ?? "invalid";
    expect(matchesGeneralFilter({ id: "shop", source: "luc" }, detailData, detailFields, { mode: "all", rules: { [key]: { values: ["Até 10"] } } })).toBe(true);
  });
});