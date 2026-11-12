import { test } from "node:test";
import assert from "node:assert/strict";
import { showsSurveyProgressDay } from "./site-survey-progress";

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