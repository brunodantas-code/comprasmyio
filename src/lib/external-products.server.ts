/**
 * Helpers server-only para falar com a plataforma externa (programa principal).
 * Nunca importar em código de cliente — usar via src/lib/external-products.functions.ts.
 */

const DEFAULT_BASE_URL = "https://project--efd53831-b793-40e3-a8ef-13627f3457db.lovable.app";

/**
 * Extrai o código sequencial (ex.: 1_1_1_15) de um QR no formato
 * https://produto.myio.com.br/<codigo>?... — também aceita o código puro digitado manualmente.
 */
export function extractQrCode(value: string): string | null {
  const m = /produto\.myio\.com\.br\/([^?\s#]+)/i.exec(value);
  if (m?.[1]) return m[1];
  const t = value.trim();
  return /^\d+(?:_\d+)+$/.test(t) ? t : null;
}

export async function externalRequest(
  path: string,
  init: { method: string; body?: unknown },
): Promise<Record<string, unknown> | null> {
  const base = (process.env["MYIO_PRODUCTS_API_BASE"] || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const apiKey = process.env["MYIO_PRODUCTS_API_KEY"];
  if (!apiKey) throw new Error("Chave da API externa (MYIO_PRODUCTS_API_KEY) não configurada.");
  const res = await fetch(`${base}${path}`, {
    method: init.method,
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // resposta não-JSON: ignora
  }
  if (!res.ok) {
    throw new Error(`Plataforma externa respondeu ${res.status}: ${text.slice(0, 200)}`);
  }
  return json as Record<string, unknown> | null;
}
