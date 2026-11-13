import { test } from "node:test";
import assert from "node:assert/strict";
import { addedAfterSurveyOriginalList } from "./site-survey-point-origin";

test("Vila Velha distingue o último original dos pontos adicionados depois", () => {
  assert.equal(addedAfterSurveyOriginalList(202611100001, "2026-11-10T21:28:14.760965Z"), false);
  assert.equal(addedAfterSurveyOriginalList(202611100001, "2026-11-12T15:44:04.705457Z"), true);
});
test("Não atribui origem a outras visitas", () => {
  assert.equal(addedAfterSurveyOriginalList(202611100002, "2026-11-12T15:44:04.705457Z"), false);
});