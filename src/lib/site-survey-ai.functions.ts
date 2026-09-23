import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FacadeInput = z.object({
  imageDataUrl: z.string().min(32).max(12_000_000),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]),
});

function outputText(event: unknown) {
  if (!event || typeof event !== "object") return "";
  const item = event as { type?: string; delta?: string };
  return item.type === "response.output_text.delta" ? item.delta ?? "" : "";
}

export const suggestShopNameFromFacade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FacadeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("has_site_survey_permission", {
      _user_id: context.userId,
      _permission: "site_survey_agendar",
    });
    if (!allowed) throw new Error("Você não tem permissão para identificar fachadas.");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("A identificação por foto não está disponível no momento.");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
        input: [{ role: "user", content: [
          { type: "input_text", text: "Leia a fachada desta loja. Responda somente com o nome comercial visível, preservando grafia e acentos. Se não for possível identificar com segurança, responda NÃO IDENTIFICADO." },
          { type: "input_image", image_url: data.imageDataUrl },
        ] }],
      }),
    });
    if (!response.ok) {
      const message = await response.text();
      if (response.status === 429) throw new Error("Muitas análises em andamento. Aguarde e tente novamente.");
      if (response.status === 402 || response.status === 403) throw new Error(message || "A análise por foto está temporariamente indisponível.");
      throw new Error(message || "Não foi possível analisar a fachada.");
    }
    if (!response.body) throw new Error("A análise não retornou um resultado.");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = "";
    let result = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      pending += decoder.decode(chunk.value, { stream: true });
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
        try { result += outputText(JSON.parse(line.slice(6))); } catch { /* Evento de controle. */ }
      }
    }
    const name = result.trim().replace(/^['"]|['"]$/g, "");
    if (!name || name.toLocaleUpperCase("pt-BR").includes("NÃO IDENTIFICADO")) throw new Error("Não foi possível identificar o nome com segurança. Digite-o manualmente.");
    return { name: name.slice(0, 160) };
  });