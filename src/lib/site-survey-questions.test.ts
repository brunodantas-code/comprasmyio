import { test } from "node:test";
import assert from "node:assert/strict";

import { showsCustomerQuestions } from "./site-survey-questions";

test("Sanar Pendências não lista nem permite perguntas para o cliente", () => {
  assert.equal(showsCustomerQuestions("pending"), false);
});

test("Histórico do Checklist e execução mantêm as perguntas para o cliente", () => {
  assert.equal(showsCustomerQuestions("summary"), true);
  assert.equal(showsCustomerQuestions("execution"), true);
});
