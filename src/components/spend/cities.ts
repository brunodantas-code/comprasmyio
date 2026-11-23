import { z } from "zod";
import { spendStates } from "./fiscal-location";

export function spendCitiesUrl(uf: string): string | null {
  return spendStates.some(state => state === uf)
    ? `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`
    : null;
}

export async function loadSpendCities(uf: string, signal?: AbortSignal): Promise<string[]> {
  const url = spendCitiesUrl(uf);
  if (!url) return [];
  const response = await fetch(url, signal ? { signal } : {});
  if (!response.ok) throw new Error("Não foi possível consultar as cidades desta UF.");
  const rows = z.array(z.object({ nome: z.string().min(1) })).parse(await response.json());
  return [...new Set(rows.map(row => row.nome))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}