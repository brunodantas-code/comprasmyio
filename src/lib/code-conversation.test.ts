import { test } from "node:test";
import assert from "node:assert/strict";
import { canReplyToCodeQuestion } from "./code-conversation";

test("Atendente pode responder ao Solicitante em chamado atendido como o #12", () => {
  assert.equal(canReplyToCodeQuestion("atendido", true, false, 1), true);
});
test("Solicitante pode responder à pergunta do Atendente", () => {
  assert.equal(canReplyToCodeQuestion("aguardando_resposta", false, true, 1), true);
});
test("Chamados encerrados não permitem respostas", () => {
  for (const status of ["concluido", "excluido"]) assert.equal(canReplyToCodeQuestion(status, true, true, 1), false);
});
test("Sem permissão ou pergunta pendente não há resposta", () => {
  assert.equal(canReplyToCodeQuestion("atendido", false, false, 1), false);
  assert.equal(canReplyToCodeQuestion("atendido", true, false, 0), false);
});