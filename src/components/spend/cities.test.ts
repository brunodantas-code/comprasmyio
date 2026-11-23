import { afterEach, describe, expect, it, vi } from "vitest";
import { loadSpendCities, spendCitiesUrl } from "./cities";

afterEach(() => vi.unstubAllGlobals());
describe("cidades do comprovante por UF", () => {
  it("consulta somente municípios de RJ quando RJ está preenchida", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ nome: "Rio de Janeiro" }, { nome: "Porto Real" }] });
    vi.stubGlobal("fetch", fetcher);
    expect(await loadSpendCities("RJ")).toEqual(["Porto Real", "Rio de Janeiro"]);
    expect(fetcher).toHaveBeenCalledWith("https://servicodados.ibge.gov.br/api/v1/localidades/estados/RJ/municipios?orderBy=nome", {});
  });
  it("troca o escopo para ES, sem reutilizar o endereço de RJ", () => {
    expect(spendCitiesUrl("ES")).toBe("https://servicodados.ibge.gov.br/api/v1/localidades/estados/ES/municipios?orderBy=nome");
  });
  it("não consulta municípios de outros estados quando a UF está vazia", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect(await loadSpendCities("")).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });
});