import { test } from "node:test";
import assert from "node:assert/strict";
import { applyCustomerAnswer, decodeCustomerAnswerMap, encodeCustomerAnswerMap } from "./site-survey-customer-answer-import";

test("mapa de respostas sobrevive à codificação com acentos", () => {
  const map = { visit: "v1", fields: [{ field: "cq_0", point: "luc:1", label: "Loja — Ótica", question: "Qual é o LUC?" }] };
  assert.deepEqual(decodeCustomerAnswerMap(encodeCustomerAnswerMap(map)), map);
  assert.equal(decodeCustomerAnswerMap("outro"), null);
});

test("importar resposta grava texto e dá baixa só na pergunta respondida", () => {
  const answer = applyCustomerAnswer({ value: "A\nB", customer_questions: ["A", "B"], observation: "x" }, "A", " 123 ");
  assert.deepEqual(answer.customer_questions_answered, ["A"]);
  assert.deepEqual(answer.customer_question_responses, { A: "123" });
  assert.equal((answer as { observation?: string }).observation, "x");
});
