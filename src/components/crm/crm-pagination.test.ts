import { describe, expect, it } from "vitest";
import { readAllCrmPages } from "./crm-pagination";

describe("Leitura integral do CRM importado", () => {
  it("carrega os 1.627 leads sem parar nos primeiros 1.000", async () => {
    const source = Array.from({ length: 1627 }, (_, id) => ({ id }));
    const rows = await readAllCrmPages(async (from, to) => ({ data: source.slice(from, to + 1), error: null }));
    expect(rows).toHaveLength(1627);
    expect(rows[1626]?.id).toBe(1626);
  });
  it("não aceita uma leitura parcial com falha", async () => {
    await expect(readAllCrmPages(async () => ({ data: null, error: new Error("Sem acesso") }))).rejects.toThrow("Sem acesso");
  });
});