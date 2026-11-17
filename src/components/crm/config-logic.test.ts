import { describe, expect, it } from "vitest";
import { cnpjDigits, configNumber, leadStage } from "./config-logic";
describe("CRM configurações", () => {
  it("normaliza os 14 dígitos do CNPJ", () => { expect(cnpjDigits("27.222.019/0001-39")).toBe("27222019000139"); expect(() => cnpjDigits("123")).toThrow(); });
  it("preserva o estado histórico ao selecionar etapa personalizada", () => { expect(leadStage({ etapa_codigo: "reuniao", status: "em_contato" })).toBe("reuniao"); expect(leadStage({ status: "qualificado" })).toBe("qualificado"); });
  it("limita a probabilidade entre 0 e 100", () => { expect(configNumber("100", 0, 100)).toBe(100); expect(() => configNumber("101", 0, 100)).toThrow(); expect(() => configNumber("-1", 0, 100)).toThrow(); });
});