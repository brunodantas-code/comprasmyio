import { describe, expect, it } from "vitest";
import { numberedProcessSections, processContentError, reorderProcessSections, type ProcessSection } from "./mytosis-processes";

const sections: ProcessSection[] = [
  { id: "a", title: "Preparação", paragraphs: [{ id: "p1", text: "Separar os materiais." }, { id: "p2", text: "Conferir os materiais." }] },
  { id: "b", title: "Execução", paragraphs: [{ id: "p3", text: "Executar o procedimento." }] },
  { id: "c", title: "Conclusão", paragraphs: [] },
];
describe("Processos textuais", () => {
  it("numera os parágrafos sequencialmente entre seções", () => {
    expect(numberedProcessSections(sections).flatMap((s) => s.paragraphs.map((p) => p.number))).toEqual([1, 2, 3]);
  });
  it("arrastar seção recalcula sua numeração e a dos parágrafos preservando textos e IDs", () => {
    const reordered = numberedProcessSections(reorderProcessSections(sections, "b", "a"));
    expect(reordered.map((s) => [s.id, s.number])).toEqual([["b", 1], ["a", 2], ["c", 3]]);
    expect(reordered.flatMap((s) => s.paragraphs.map((p) => [p.id, p.number, p.text]))).toEqual([["p3", 1, "Executar o procedimento."], ["p1", 2, "Separar os materiais."], ["p2", 3, "Conferir os materiais."]]);
    expect(sections[0].id).toBe("a");
  });
  it("recalcula a sequência depois de remover uma seção", () => {
    const remaining = numberedProcessSections(sections.filter((s) => s.id !== "a"));
    expect(remaining[0].number).toBe(1);
    expect(remaining[0].paragraphs[0].number).toBe(1);
  });
  it("não permite salvar parágrafos vazios", () => {
    expect(processContentError({ name: "Fabricação", sections: [{ id: "a", title: "Preparação", paragraphs: [{ id: "p", text: " " }] }] })).toBe("Preencha o parágrafo ou remova-o.");
    expect(processContentError({ name: "Fabricação", sections })).toBeNull();
  });
});