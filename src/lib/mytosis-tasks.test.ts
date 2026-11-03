import { describe, expect, it } from "vitest";
import { canCompleteBoxTask, predecessorTaskSignal } from "./mytosis-tasks";

describe("tarefas internas do Mytosis", () => {
  const task = { created_by: "criador", responsible_id: "responsavel" };
  it("permite ao criador marcar ou desmarcar a conclusão", () => {
    expect(canCompleteBoxTask(task, "criador", true)).toBe(true);
  });
  it("permite ao responsável marcar ou desmarcar a conclusão", () => {
    expect(canCompleteBoxTask(task, "responsavel", true)).toBe(true);
  });
  it("não permite a outro envolvido concluir", () => {
    expect(canCompleteBoxTask(task, "envolvido", true)).toBe(false);
    expect(canCompleteBoxTask(task, "criador", false)).toBe(false);
  });
  it("sinaliza pendências anteriores sem bloquear avanço", () => {
    expect(predecessorTaskSignal("proxima", [{ node_id: "anterior", completed: false }, { node_id: "anterior", completed: true }, { node_id: "outro", completed: false }], [{ predecessor_id: "anterior", successor_id: "proxima" }])).toEqual({ pending: 1, blocksAdvance: false });
  });
});