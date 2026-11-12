import { test } from "node:test";
import assert from "node:assert/strict";

import { customerHistorySectionIds, pendingCustomerQuestions, customerQuestionResponses, registrationCustomerQuestion, showsCustomerQuestions, withRegisteredTechnicians, matchesSurveyPointSearch } from "./site-survey-questions";

test("Concluída na busca mostra somente lojas concluídas", () => {
  assert.equal(matchesSurveyPointSearch({ label: "LUC 12 — Loja", completionStatus: "concluida" }, "Concluída"), true);
  assert.equal(matchesSurveyPointSearch({ label: "LUC 12 — Loja", completionStatus: "pendente" }, "Concluída"), false);
});
test("Trecho conclu da captura filtra lojas concluídas enquanto digita", () => {
  for (const query of ["conclu", "concluí", "concluíd", "concluída", "concluídas"]) {
    assert.equal(matchesSurveyPointSearch({ label: "Loja", completionStatus: "concluida" }, query), true);
    assert.equal(matchesSurveyPointSearch({ label: "Loja", completionStatus: "pendente" }, query), false);
  }
});
test("Não conclu parcial filtra pendentes e permite combinar LUC", () => {
  assert.equal(matchesSurveyPointSearch({ label: "LUC 12 — Loja", completionStatus: "pendente" }, "não conclu 12"), true);
  assert.equal(matchesSurveyPointSearch({ label: "LUC 12 — Loja", completionStatus: "concluida" }, "não conclu 12"), false);
  assert.equal(matchesSurveyPointSearch({ label: "LUC 12 — Loja", completionStatus: "cancelada" }, "não conclu"), false);
});
test("Não concluída não se confunde com Concluída nem com cancelada", () => {
  assert.equal(matchesSurveyPointSearch({ label: "LUC 12 — Loja", completionStatus: "pendente" }, "Não concluída"), true);
  for (const completionStatus of ["concluida", "cancelada"]) assert.equal(matchesSurveyPointSearch({ label: "Loja", completionStatus }, "nao concluida"), false);
});
test("Busca combina situação com LUC ou nome e preserva busca comum", () => {
  const point = { label: "LUC 12 — Le Biscuit", completionStatus: "pendente" };
  assert.equal(matchesSurveyPointSearch(point, "não concluída 12"), true);
  assert.equal(matchesSurveyPointSearch(point, "Le Biscuit não concluída"), true);
  assert.equal(matchesSurveyPointSearch(point, "não concluída 99"), false);
  assert.equal(matchesSurveyPointSearch(point, "Biscuit"), true);
  assert.equal(matchesSurveyPointSearch(point, ""), true);
});

test("Técnico cadastrado satisfaz a pergunta da equipe sem resposta comum e preserva EPIs", () => {
  const answers = withRegisteredTechnicians(new Map([["epi", "Não é necessário"]]), [{ id: "team", question_key: "shopping_maintenance_companions" }, { id: "epi" }], [{ technician_id: "leandro", mobile_phone: "(21) 98766-9243" }]);
  assert.deepEqual(answers.get("team"), ["leandro"]);
  assert.equal(answers.get("epi"), "Não é necessário");
});

test("Resposta antiga não encobre uma equipe sem técnico válido", () => {
  const questions = [{ id: "team", question_key: "shopping_maintenance_companions" }];
  assert.deepEqual(withRegisteredTechnicians(new Map([["team", ["old"]]]), questions, []).get("team"), []);
  assert.deepEqual(withRegisteredTechnicians(new Map(), questions, [{ technician_id: "leandro", mobile_phone: "" }]).get("team"), []);
});

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

test("Pergunta e resposta continuam na seção original após trocar para Quadros Elétricos", () => {
  const answer = { customer_questions: ["Onde se localiza fisicamente esse AC?"], customer_question_responses: { "Onde se localiza fisicamente esse AC?": "Na parte externa, conforme foto anexa." }, customer_questions_answered: ["Onde se localiza fisicamente esse AC?"] };
  assert.deepEqual([...customerHistorySectionIds([question], [{ question_id: "customer", answer }])], ["s7"]);
  assert.equal(customerQuestionResponses(answer)["Onde se localiza fisicamente esse AC?"], "Na parte externa, conforme foto anexa.");
  assert.deepEqual(pendingCustomerQuestions(answer), []);
});
test("Resposta salva permanece pendente até confirmação manual", () => {
  const answer = { customer_questions: ["Confirma a existência do registro?"], customer_question_responses: { "Confirma a existência do registro?": "Confirmada existência do registro no forro." } };
  assert.deepEqual(pendingCustomerQuestions(answer), ["Confirma a existência do registro?"]);
  assert.deepEqual(pendingCustomerQuestions({ ...answer, customer_questions_answered: ["Confirma a existência do registro?"] }), []);
});
test("Perguntas de outros pontos não acrescentam seções ao histórico", () => {
  assert.deepEqual([...customerHistorySectionIds([question], [])], []);
});

test("bare não filters by the Não concluída tag", () => {
  assert.equal(matchesSurveyPointSearch({ label: "LUC Não identificado — Vivo", completionStatus: "concluida" }, "não"), false);
  assert.equal(matchesSurveyPointSearch({ label: "LUC 1 — Loja", completionStatus: "pendente" }, "não"), true);
  assert.equal(matchesSurveyPointSearch({ label: "LUC 1 — Loja", completionStatus: "pendente" }, "nao co"), true);
});
