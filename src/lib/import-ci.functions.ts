import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  rows: z.array(z.array(z.string())).max(2000),
  items: z.array(z.object({ key: z.string(), name: z.string(), lotQuantity: z.number() })).max(500),
});

type Match = { key: string; quantity: number };

export const matchCiSpreadsheet = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<Match[]> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("IA indisponível: chave não configurada.");

    const sheet = data.rows
      .map((r) => r.filter(Boolean).join(" | "))
      .filter((l) => l.trim().length > 0)
      .slice(0, 800)
      .join("\n");

    const catalog = data.items.map((i) => `${i.key} :: ${i.name} (lote de ${i.lotQuantity} un)`).join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          {
            role: "system",
            content:
              "Você recebe uma planilha de lista de materiais (BOM/CI) e um catálogo de itens importados. " +
              "Identifique, para cada item do catálogo que apareça na planilha, a quantidade total em UNIDADES desejada. " +
              "Use apenas as chaves exatas do catálogo. Ignore itens não encontrados. Responda somente via a função.",
          },
          { role: "user", content: `CATÁLOGO:\n${catalog}\n\nPLANILHA:\n${sheet}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "registrar_quantidades",
              description: "Registra as quantidades encontradas",
              parameters: {
                type: "object",
                properties: {
                  matches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { key: { type: "string" }, quantity: { type: "number" } },
                      required: ["key", "quantity"],
                    },
                  },
                },
                required: ["matches"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "registrar_quantidades" } },
      }),
    });

    if (res.status === 429) throw new Error("Muitas requisições à IA. Tente novamente em instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
    if (!res.ok) throw new Error(`Falha na IA (${res.status}): ${await res.text()}`);

    const json = await res.json();
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return [];
    const parsed = JSON.parse(args) as { matches?: Match[] };
    const valid = new Set(data.items.map((i) => i.key));
    return (parsed.matches ?? []).filter((m) => valid.has(m.key) && Number.isFinite(m.quantity) && m.quantity > 0);
  });
