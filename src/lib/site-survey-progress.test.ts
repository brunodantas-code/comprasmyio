import { test } from "node:test";
import assert from "node:assert/strict";
import { showsSurveyProgressDay, surveyProgressTechnicianId, surveyVisitTotals } from "./site-survey-progress";

test("10/11/2026 não mostra gráfico na visita indicada", () => {
  assert.equal(showsSurveyProgressDay(202611100001, "2026-11-10"), false);
});

test("11/11/2026 não mostra gráfico na visita indicada", () => {
  assert.equal(showsSurveyProgressDay(202611100001, "2026-11-11"), false);
});

test("Preserva 12/11 e as mesmas datas nas demais visitas", () => {
  assert.equal(showsSurveyProgressDay(202611100001, "2026-11-12"), true);
  assert.equal(showsSurveyProgressDay(202611120001, "2026-11-10"), true);
  assert.equal(showsSurveyProgressDay(202611120001, "2026-11-11"), true);
});

test("Vila Velha atribui o gráfico a Leandro Silva, mesmo com conclusão registrada por Leonardo", () => {
  assert.equal(surveyProgressTechnicianId("738aaf25-602a-4943-9415-6d8c1ec092af", "6ca0eff8-7393-47bc-9054-9001138bcbc2"), "738aaf25-602a-4943-9415-6d8c1ec092af");
});

test("Sem responsável cadastrado preserva a identificação disponível", () => {
  assert.equal(surveyProgressTechnicianId(null, "recorder"), "recorder");
  assert.equal(surveyProgressTechnicianId(null, null), null);
});

test("Totalizadores contam concluídas e a realizar, sem incluir canceladas", () => {
  assert.deepEqual(surveyVisitTotals([{ completion_status: "concluida" }, { completion_status: "concluida" }, { completion_status: "pendente" }, { completion_status: "cancelada" }]), { completed: 2, remaining: 1 });
});