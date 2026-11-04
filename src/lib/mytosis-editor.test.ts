import { expect, it } from "vitest";
import { initialNodeShape, requiresNodeResponsible } from "./mytosis-editor";

it("etapas de Fluxograma não exigem Responsável", () => {
  expect(requiresNodeResponsible(true)).toBe(false);
});

it("OKRs mantêm Responsável obrigatório", () => {
  expect(requiresNodeResponsible(false)).toBe(true);
});

it("novo Fluxograma começa em Início/fim mesmo se o padrão for Processo", () => {
  expect(initialNodeShape(true, null, null, "process")).toBe("terminal");
});

it("novas etapas usam o padrão salvo", () => {
  expect(initialNodeShape(true, "root", null, "decision")).toBe("decision");
});

it("editar um box existente preserva sua forma", () => {
  expect(initialNodeShape(true, null, "process", "terminal")).toBe("process");
});