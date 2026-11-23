import { describe, expect, it } from "vitest";
import { spendFiscalLocation, validSpendAccessKey } from "./fiscal-location";

function keyFor(code: string) {
  const base = `${code}26112722201900013965001000000001112345678`;
  let sum = 0;
  for (let i = 42; i >= 0; i--) sum += Number(base.charAt(i)) * (2 + (42 - i) % 8);
  const rest = sum % 11;
  return base + (rest < 2 ? 0 : 11 - rest);
}
describe("Local fiscal do Spend", () => {
  it("identifica RJ e ES pela chave válida sem inventar a cidade", () => {
    expect(spendFiscalLocation({ chave_acesso: keyFor("33") })).toEqual({ city: "", uf: "RJ", access_key: keyFor("33") });
    expect(spendFiscalLocation({ chave_acesso: keyFor("32") }).uf).toBe("ES");
  });
  it("preserva a cidade impressa e prioriza a UF da chave válida", () => {
    expect(spendFiscalLocation({ cidade: "Vila Velha", uf: "RJ", chave_acesso: keyFor("32") })).toEqual({ city: "Vila Velha", uf: "ES", access_key: keyFor("32") });
  });
  it("não usa chave ilegível ou inválida e aceita UF legível do endereço", () => {
    const key = keyFor("33");
    expect(validSpendAccessKey(key.slice(0, 43) + (Number(key.charAt(43)) + 1) % 10)).toBeNull();
    expect(spendFiscalLocation({ chave_acesso: "123", uf: "rj" })).toEqual({ city: "", uf: "RJ", access_key: null });
    expect(spendFiscalLocation({ uf: "XX" }).uf).toBe("");
  });
});