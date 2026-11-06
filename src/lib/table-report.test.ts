import { describe, expect, it } from "vitest";
import { mergeTableReports } from "./table-report";

describe("relatórios das listas", () => {
  it("preserva ordem e valores numéricos das linhas filtradas", () => {
    expect(mergeTableReports([{ columns: ["Approval", "Valor"], rows: [["9", 1060], ["8", 1508]] }]).rows).toEqual([["9", 1060], ["8", 1508]]);
  });
  it("reúne grupos sem perder colunas distintas", () => {
    expect(mergeTableReports([{ columns: ["Approval"], rows: [["9"]] }, { columns: ["Approval", "Status"], rows: [["8", "Conforme"]] }])).toEqual({ columns: ["Approval", "Status"], rows: [["9", null], ["8", "Conforme"]] });
  });
});