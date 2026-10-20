import { test } from "node:test";
import assert from "node:assert/strict";
import { matchTemplateQuestions } from "./site-survey-template-switch";
test("aproveita perguntas com mesmo enunciado ou chave", () => {
  const m = matchTemplateQuestions([{ id: "a", prompt: "Tensão do quadro?" }, { id: "b", prompt: "Vazão", question_key: "flow" }, { id: "c", prompt: "Cisterna?" }], [{ id: "x", prompt: "tensao do quadro" }, { id: "y", prompt: "Outra", question_key: "flow" }]);
  assert.deepEqual(Object.fromEntries(m), { a: "x", b: "y" });
});
