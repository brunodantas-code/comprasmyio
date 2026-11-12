import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesSurveyCompletion } from "./site-survey-completion-filter";

test("Não concluídas inclui pendentes, não inclui concluídas ou canceladas", () => {
  const rows = [{ id: "nao-iniciada", status: "pendente" }, { id: "iniciada", status: "pendente" }, { id: "concluida", status: "concluida" }, { id: "cancelada", status: "cancelada" }];
  assert.deepEqual(rows.filter(row => matchesSurveyCompletion(row.status, "pendente")).map(row => row.id), ["nao-iniciada", "iniciada"]);
});

test("Todas mostra a relação completa e Concluídas somente as concluídas", () => {
  assert.equal(matchesSurveyCompletion("cancelada", "all"), true);
  assert.equal(matchesSurveyCompletion("concluida", "concluida"), true);
  assert.equal(matchesSurveyCompletion("pendente", "concluida"), false);
});