import { test } from "node:test";
import assert from "node:assert/strict";
import { canReplyToCodeQuestion, shouldShowCodeAnswer, canConcludeCodeTicket } from "./code-conversation";

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

test("Resposta em Atendido não fica oculta pelo modo anterior de nova pergunta", () => {
  const canReply = canReplyToCodeQuestion("atendido", true, false, 1);
  assert.equal(shouldShowCodeAnswer(canReply, "question", false), true);
  assert.equal(shouldShowCodeAnswer(false, "question", false), false);
});

test("Solicitante também pode responder em Atendido", () => {
  assert.equal(canReplyToCodeQuestion("atendido", false, true, 1), true);
});

test("Somente o Solicitante dá baixa definitiva no chamado Atendido", () => {
  assert.equal(canConcludeCodeTicket("atendido", true), true);
  assert.equal(canConcludeCodeTicket("atendido", false), false);
  assert.equal(canConcludeCodeTicket("concluido", true), false);
});