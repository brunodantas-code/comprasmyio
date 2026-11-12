import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSurveyPointChoice, surveyPointChoice } from "./site-survey-point-choice";

const types = [{ id: "deposito-id", name: "Depósito", discipline: "electrical" }];

test("Depósito selecionado usa o ambiente elétrico cadastrado sem criar outra classificação", () => {
  assert.deepEqual(resolveSurveyPointChoice("depot", types), { pointType: "environment", environmentTypeId: "deposito-id" });
  assert.equal(surveyPointChoice("environment", "deposito-id", types), "depot");
});

test("Trocar Depósito por Ambiente retira somente o vínculo de tipo", () => {
  assert.deepEqual(resolveSurveyPointChoice("environment", types), { pointType: "environment", environmentTypeId: "" });
});