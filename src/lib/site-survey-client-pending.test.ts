import { test } from "node:test";
import assert from "node:assert/strict";
import { clientPointQuestionsAndNotes, clientQuestionCoveredByLucSection, unidentifiedLucPoints } from "./site-survey-client-pending";

test("Relatório do cliente inclui observação do cofre e pergunta pendente do mesmo ponto", () => {
  const responses = [
    { question_id: "notes", visit_luc_id: "loja", visit_environment_id: null, answer: { value: "No cofre está Commcenter" } },
    { question_id: "customer", visit_luc_id: "loja", visit_environment_id: null, answer: { customer_questions: ["Mantemos na implantação?"], customer_question_responses: { "Mantemos na implantação?": "Sim" } } },
    { question_id: "notes", visit_luc_id: "outra", visit_environment_id: null, answer: "No cofre está Ponto Kids" },
    { question_id: "electrical", visit_luc_id: "loja", visit_environment_id: null, answer: "Busway" },
  ];
  assert.deepEqual(clientPointQuestionsAndNotes("luc:loja", responses, [{ id: "notes", prompt: "Observações finais da visita" }, { id: "customer", prompt: "Perguntas para o cliente" }, { id: "electrical", prompt: "Onde se encontra o quadro elétrico?" }]), ["No cofre está Commcenter", "Mantemos na implantação?"]);
});
test("Observação vazia/atalho não entra e pergunta confirmada não volta ao relatório", () => {
  assert.deepEqual(clientPointQuestionsAndNotes("luc:loja", [
    { question_id: "notes", visit_luc_id: "loja", visit_environment_id: null, answer: "Nenhuma observação adicional", question_snapshot: { prompt: "Observações finais da visita" } },
    { question_id: "customer", visit_luc_id: "loja", visit_environment_id: null, answer: { customer_questions: ["Confirmar"], customer_questions_answered: ["Confirmar"] } },
  ], []), []);
});

test("Loja vaga sem LUC entra na conferência; com LUC não, ambiente permanece dispensado", () => {
  const points = [
    { value: "a", label: "Vaga A", pointType: "vacant", lucNumber: "" },
    { value: "b", label: "Vaga B", pointType: "vacant", lucNumber: "123" },
    { value: "c", label: "Ambiente", pointType: "environment", lucNumber: "" },
  ];
  assert.deepEqual(unidentifiedLucPoints(points).map((point) => point.value), ["a"]);
});
test("duplicateNamePoints agrupa mesmo nome com LUCs diferentes", async () => {
  const { duplicateNamePoints } = await import("@/lib/site-survey-client-pending");
  const points = [
    { value: "a", label: "Vivara", pointType: "shop", lucNumber: "101", name: "Vivara" },
    { value: "b", label: "Vivara", pointType: "shop", lucNumber: "202", name: "Vivara" },
    { value: "c", label: "Vivara", pointType: "shop", lucNumber: "101", name: "Vivara" },
    { value: "d", label: "Cacau Show", pointType: "kiosk", lucNumber: "300", name: "Cacau Show" },
    { value: "e", label: "Ambiente", pointType: "environment", name: "Vivara" },
  ];
  const groups = duplicateNamePoints(points);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].map((point) => point.value), ["a", "b"]);
});
test("duplicateNamePoints ignora lojas e quiosques vagos, mesmo com nome repetido", async () => {
  const { duplicateNamePoints } = await import("@/lib/site-survey-client-pending");
  const points = [
    { value: "a", label: "Vaga", pointType: "vacant", lucNumber: "Q008", name: "Vaga" },
    { value: "b", label: "Vaga", pointType: "vacant_kiosk", lucNumber: "Q113", name: "Vaga" },
    { value: "c", label: "Vaga", pointType: "vacant", lucNumber: "S007", name: "Vaga" },
    { value: "d", label: "Vivara", pointType: "shop", lucNumber: "101", name: "Vivara" },
    { value: "e", label: "Vivara", pointType: "shop", lucNumber: "202", name: "Vivara" },
  ];
  const groups = duplicateNamePoints(points);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].map((point) => point.value), ["d", "e"]);
});
test("vacantShopPoints lista apenas lojas vagas, na ordem alfabética", async () => {
  const { vacantShopPoints } = await import("@/lib/site-survey-client-pending");
  const points = [
    { value: "a", label: "Vaga 02", pointType: "vacant", name: "Vaga 02" },
    { value: "b", label: "Vivara", pointType: "shop", name: "Vivara" },
    { value: "c", label: "Vaga 10", pointType: "vacant", name: "Vaga 10" },
    { value: "d", label: "Ambiente", pointType: "environment", name: "Vaga 01" },
  ];
  assert.deepEqual(vacantShopPoints(points).map((point) => point.value), ["a", "c"]);
});
test("splitUnidentifiedByName separa nome identificado de nome não identificado", async () => {
  const { splitUnidentifiedByName } = await import("@/lib/site-survey-client-pending");
  const [named, unnamed] = splitUnidentifiedByName([
    { value: "a", label: "Chaves", pointType: "kiosk", name: "Chaves", lucNumber: "Não identificado" },
    { value: "b", label: "x", pointType: "kiosk", name: "Não Identificado", lucNumber: "Não identificado" },
  ]);
  assert.deepEqual(named.map((p) => p.value), ["a"]);
  assert.deepEqual(unnamed.map((p) => p.value), ["b"]);
});

test("Magic Game com nome conhecido e LUC não identificado não repete a cobrança exclusiva de LUC", () => {
  const point = { value: "luc:magic", label: "Magic Game", name: "Magic Game", pointType: "kiosk", lucNumber: "Não identificado" };
  assert.equal(clientQuestionCoveredByLucSection(point, "Informar o LUC para cadastro no sistema."), true);
  assert.equal(clientQuestionCoveredByLucSection({ ...point, pointType: "shop", lucNumber: "" }, "Informar o número do LUC."), true);
});

test("A deduplicação de LUC preserva outras perguntas, pedidos compostos e pontos fora do capítulo", () => {
  const point = { value: "luc:magic", label: "Magic Game", name: "Magic Game", pointType: "kiosk", lucNumber: "Não identificado" };
  assert.equal(clientQuestionCoveredByLucSection(point, "Confirmar implantação do medidor?"), false);
  assert.equal(clientQuestionCoveredByLucSection(point, "Informar o LUC e confirmar a implantação."), false);
  assert.equal(clientQuestionCoveredByLucSection({ ...point, lucNumber: "Q123" }, "Informar o LUC para cadastro no sistema."), false);
  assert.equal(clientQuestionCoveredByLucSection({ ...point, name: "Não identificado" }, "Informar o LUC para cadastro no sistema."), false);
  assert.equal(clientQuestionCoveredByLucSection({ ...point, pointType: "environment" }, "Informar o LUC para cadastro no sistema."), false);
});
