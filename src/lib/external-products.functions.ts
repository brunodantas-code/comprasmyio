import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const generateInput = z.object({
  productType: z.string().trim().min(1).max(120),
});

const pushInput = z.object({
  qrs: z.array(z.string().trim().min(1).max(500)).min(1).max(200),
  location: z.enum(["estoque", "expedicao", "transporte", "cliente", "tecnico", "perdido", "avariado"]),
  status: z.enum(["instalado", "parado"]).nullish(),
  technician: z.string().trim().max(120).nullish(),
  clientName: z.string().trim().max(200).nullish(),
});

/**
 * Gera um novo QR code na plataforma externa. O produto nasce com
 * location "estoque" (Estoque Myio) e status "parado".
 */
export const generateExternalQr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => generateInput.parse(data))
  .handler(async ({ data }) => {
    const { externalRequest, extractQrCode } = await import("./external-products.server");
    const json = await externalRequest("/api/public/products", {
      method: "POST",
      body: { product_type: data.productType, location: "estoque", status: "parado" },
    });
    const product = ((json?.product as Record<string, unknown> | undefined) ?? json) as Record<
      string,
      unknown
    > | null;
    const qrUrl =
      (json?.qr_url as string | undefined) ??
      (product?.qr_url as string | undefined) ??
      (product?.qr as string | undefined) ??
      null;
    const code =
      (product?.code as string | undefined) ??
      (json?.code as string | undefined) ??
      (qrUrl ? extractQrCode(qrUrl) : null);
    if (!qrUrl) throw new Error("A plataforma externa não retornou o link do QR code.");
    return { code, qrUrl };
  });

/**
 * Atualiza o local (e opcionalmente status/técnico/cliente) de uma lista de
 * QR codes na plataforma externa. Chamada a cada mudança de setor interna.
 */
export const pushExternalQrLocations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => pushInput.parse(data))
  .handler(async ({ data }) => {
    const { externalRequest, extractQrCode } = await import("./external-products.server");
    const results: { qr: string; ok: boolean; error?: string }[] = [];
    for (const qr of data.qrs) {
      const code = extractQrCode(qr);
      if (!code) {
        results.push({ qr, ok: false, error: "QR sem código da plataforma externa" });
        continue;
      }
      try {
        await externalRequest(`/api/public/products/${encodeURIComponent(code)}`, {
          method: "PATCH",
          body: {
            location: data.location,
            ...(data.status ? { status: data.status } : {}),
            ...(data.technician ? { technician: data.technician } : {}),
            ...(data.clientName ? { nome_cliente: data.clientName } : {}),
          },
        });
        results.push({ qr, ok: true });
      } catch (e) {
        results.push({ qr, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }
    return { total: data.qrs.length, updated: results.filter((r) => r.ok).length, results };
  });
