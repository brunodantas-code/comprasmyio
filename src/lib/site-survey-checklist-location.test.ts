import { test } from "node:test";
import assert from "node:assert/strict";
import { checklistElectricalLocation } from "./site-survey-checklist-location";

test("Localização mostra Busway do checklist somente para o ponto correspondente", () => {
  const data = { sections: [{ id: "electrical", template_id: "shopping" }], questions: [{ id: "where", section_id: "electrical", prompt: "Onde se encontra o quadro elétrico?" }], responses: [{ question_id: "where", visit_luc_id: "loja", visit_environment_id: null, answer: { value: "Busway" } }] };
  assert.equal(checklistElectricalLocation({ id: "loja", source: "luc", template_id: "shopping" }, data), "Busway");
  assert.equal(checklistElectricalLocation({ id: "outra", source: "luc", template_id: "shopping" }, data), "");
});
test("Checklist atual tem prioridade e não usa observação como localização", () => {
  const data = { sections: [{ id: "old", template_id: "old" }, { id: "new", template_id: "new" }], questions: [{ id: "old", section_id: "old", prompt: "Onde se encontra o quadro elétrico?" }, { id: "new", section_id: "new", prompt: "Onde se encontra o quadro elétrico?" }, { id: "note", section_id: "new", prompt: "Observações finais da visita" }], responses: [{ question_id: "old", visit_luc_id: "loja", visit_environment_id: null, answer: "Busway" }, { question_id: "new", visit_luc_id: "loja", visit_environment_id: null, answer: "Dentro da loja" }, { question_id: "note", visit_luc_id: "loja", visit_environment_id: null, answer: "No cofre está Commcenter" }] };
  assert.equal(checklistElectricalLocation({ id: "loja", source: "luc", template_id: "new" }, data), "Dentro da loja");
});