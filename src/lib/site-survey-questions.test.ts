import { test } from "node:test";
import assert from "node:assert/strict";

import { registrationCustomerQuestion, showsCustomerQuestions } from "./site-survey-questions";

test("Sanar Pendências não lista nem permite perguntas para o cliente", () => {
  assert.equal(showsCustomerQuestions("pending"), false);
});

test("Histórico do Checklist e execução mantêm as perguntas para o cliente", () => {
  assert.equal(showsCustomerQuestions("summary"), true);
  assert.equal(showsCustomerQuestions("execution"), true);
});

const sections = [{ id: "s7", template_id: "visit", active: true }, { id: "env", template_id: "environment", active: true }];
const question = { id: "customer", section_id: "s7", active: true, prompt: "Perguntas para o cliente" };
test("Loja vaga mantém a pergunta da visita disponível", () => {
  assert.equal(registrationCustomerQuestion([question], sections, "visit", "visit")?.id, "customer");
});
test("Ambiente sem seção 7 usa a pergunta da visita", () => {
  assert.equal(registrationCustomerQuestion([question], sections, "environment", "visit")?.id, "customer");
});
test("Ponto sem respostas e sem pendências pode adicionar pergunta", () => {
  assert.equal(registrationCustomerQuestion([question], sections, "environment", "visit", [])?.id, "customer");
});
test("Perguntas existentes preservam o identificador ao trocar modelo", () => {
  const own = { ...question, id: "own", section_id: "env" };
  assert.equal(registrationCustomerQuestion([own, question], sections, "environment", "visit", ["customer"])?.id, "customer");
  assert.equal(registrationCustomerQuestion([own, question], sections, "environment", "visit")?.id, "own");
});
