import { describe, expect, it } from "vitest";
import { surveyContractName } from "./site-survey-contract-name";

describe("Nome do Contrato", () => {
  it("copia o mesmo nome da loja no cadastro", () => {
    expect(surveyContractName("Loja Exemplo", "", true)).toBe("Loja Exemplo");
  });
  it("preserva o contrato editado pelo usuário", () => {
    expect(surveyContractName("Nova Fachada", "Razão contratual", false)).toBe("Razão contratual");
  });
});