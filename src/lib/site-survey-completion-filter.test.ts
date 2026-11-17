import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesSurveyCompletion, surveyPendingFilterValue } from "./site-survey-completion-filter";
import { matchesColumnFilter } from "./column-filters";

test("Não concluídas inclui pendentes, não inclui concluídas ou canceladas", () => {
  const rows = [{ id: "nao-iniciada", status: "pendente" }, { id: "iniciada", status: "pendente" }, { id: "concluida", status: "concluida" }, { id: "cancelada", status: "cancelada" }];
  assert.deepEqual(rows.filter(row => matchesSurveyCompletion(row.status, "pendente")).map(row => row.id), ["nao-iniciada", "iniciada"]);
});

test("Todas mostra a relação completa e Concluídas somente as concluídas", () => {
  assert.equal(matchesSurveyCompletion("cancelada", "all"), true);
  assert.equal(matchesSurveyCompletion("concluida", "concluida"), true);
  assert.equal(matchesSurveyCompletion("pendente", "concluida"), false);
});

const pendingCounts = [0, 1, 4];
const filteredCounts = (filter: "all" | "with" | "without") => pendingCounts.filter(count => matchesColumnFilter("number", count, String(count), surveyPendingFilterValue(filter)));

test("Todas mantém pontos com zero e com pendências", () => {
  assert.deepEqual(filteredCounts("all"), [0, 1, 4]);
});

test("Com pendências inclui somente contagens maiores que zero", () => {
  assert.deepEqual(filteredCounts("with"), [1, 4]);
});

test("Sem pendências inclui somente contagem zero", () => {
  assert.deepEqual(filteredCounts("without"), [0]);
});