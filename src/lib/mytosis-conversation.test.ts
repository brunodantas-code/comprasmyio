import { describe, expect, it } from "vitest";
import { pendingOkrQuestions } from "./mytosis-conversation";

describe("conversa dos OKRs", () => {
  const question = { id: "q1", node_id: "okr", author_id: "responsavel", kind: "question", reply_to_id: null };
  it("permite responder perguntas pendentes de outro participante", () => {
    expect(pendingOkrQuestions([question], "okr", "criador").map((q) => q.id)).toEqual(["q1"]);
  });
  it("não permite responder à própria pergunta", () => {
    expect(pendingOkrQuestions([question], "okr", "responsavel")).toEqual([]);
  });
  it("não mistura perguntas de outros OKRs", () => {
    expect(pendingOkrQuestions([question], "outro-okr", "criador")).toEqual([]);
  });
  it("retira perguntas respondidas das pendências", () => {
    expect(pendingOkrQuestions([question, { id: "a1", node_id: "okr", author_id: "criador", kind: "answer", reply_to_id: "q1" }], "okr", "criador")).toEqual([]);
  });
  it("direciona a pergunta somente ao destinatário escolhido", () => {
    const directed = { ...question, recipient_id: "destinatario" };
    expect(pendingOkrQuestions([directed], "okr", "destinatario").map((q) => q.id)).toEqual(["q1"]);
    expect(pendingOkrQuestions([directed], "okr", "outro-usuario")).toEqual([]);
  });
  it("remove a pendência direcionada após resposta do destinatário", () => {
    const directed = { ...question, recipient_id: "destinatario" };
    expect(pendingOkrQuestions([directed, { id: "a1", node_id: "okr", author_id: "destinatario", kind: "answer", reply_to_id: "q1", recipient_id: null }], "okr", "destinatario")).toEqual([]);
  });
});