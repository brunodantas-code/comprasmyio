import { test } from "node:test";
import assert from "node:assert/strict";
import { applyCustomerAnswer, appendClientObservation, confirmedReportPoints, decodeCustomerAnswerMap, encodeCustomerAnswerMap, matchLegacyReportPoint } from "./site-survey-customer-answer-import";

test("mapa de respostas sobrevive à codificação com acentos", () => {
  const map = { visit: "v1", fields: [{ field: "cq_0", point: "luc:1", label: "Loja — Ótica", question: "Qual é o LUC?" }] };
  assert.deepEqual(decodeCustomerAnswerMap(encodeCustomerAnswerMap(map)), map);
  assert.equal(decodeCustomerAnswerMap("outro"), null);
});

test("observações do PDF entram nas observações finais preservando texto e fotos", () => {
  assert.deepEqual(appendClientObservation({ value: "Observação original", photo_reference_id: "foto-1" }, "277 tampas, 102 bases"), { value: "Observação original\n\n277 tampas, 102 bases", photo_reference_id: "foto-1" });
});

test("reimportação da mesma observação não duplica o checklist", () => {
  const first = appendClientObservation(null, "Cliente confirmou a loja");
  assert.equal(appendClientObservation(first, "Cliente confirmou a loja").value, "Cliente confirmou a loja");
});

test("observação real substitui o atalho sem observação", () => {
  assert.equal(appendClientObservation({ value: "Nenhuma observação adicional" }, "Não tem medidor").value, "Não tem medidor");
});

test("somente checks confirmados da categoria deixam o próximo relatório", () => {
  const fields = [
    { field: "a", point: "luc:1", label: "Loja", question: "Confirmação", kind: "confirmation" as const, category: "duplicate" as const },
    { field: "b", point: "luc:2", label: "Loja vaga", question: "Confirmação", kind: "confirmation" as const, category: "vacant" as const },
    { field: "c", point: "luc:3", label: "Loja", question: "Observação", kind: "observation" as const },
  ];
  assert.deepEqual([...confirmedReportPoints(fields, "duplicate")], ["luc:1"]);
  assert.deepEqual([...confirmedReportPoints(fields, "vacant")], ["luc:2"]);
});

test("PDF antigo identifica pelo LUC impresso, nunca pela ordem atual", () => {
  const points = [{ value: "luc:b", label: "Ótica", name: "Ótica", lucNumber: "002" }, { value: "luc:a", label: "Ótica", name: "Ótica", lucNumber: "001" }];
  assert.equal(matchLegacyReportPoint(["Ótica", "001", "OK"], points)?.value, "luc:a");
  assert.equal(matchLegacyReportPoint(["Ótica", "Sem LUC"], points), undefined);
});

test("PDF antigo não associa observação a lojas sem LUC e nome ambíguo", () => {
  const points = [{ value: "luc:a", label: "Quiosque", name: "Quiosque", lucNumber: null }, { value: "luc:b", label: "Quiosque", name: "Quiosque", lucNumber: null }];
  assert.equal(matchLegacyReportPoint(["Quiosque"], points), undefined);
});

test("LUC impresso prevalece sobre outro ponto de mesmo nome sem LUC", () => {
  assert.equal(matchLegacyReportPoint(["Tem Total Home", "L128", "Mall"], [{ value: "luc:unknown", label: "Tem Total Home", name: "Tem Total Home", lucNumber: "Não identificado" }, { value: "luc:known", label: "Tem Total Home", name: "Tem Total Home", lucNumber: "L128" }])?.value, "luc:known");
});

test("importar resposta grava texto e dá baixa só na pergunta respondida", () => {
  const answer = applyCustomerAnswer({ value: "A\nB", customer_questions: ["A", "B"], observation: "x" }, "A", " 123 ");
  assert.deepEqual(answer.customer_questions_answered, ["A"]);
  assert.deepEqual(answer.customer_question_responses, { A: "123" });
  assert.equal((answer as { observation?: string }).observation, "x");
});
