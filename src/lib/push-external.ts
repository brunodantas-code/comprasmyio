import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { pushExternalQrLocations } from "@/lib/external-products.functions";

export type ExternalLocation =
  | "estoque"
  | "expedicao"
  | "transporte"
  | "cliente"
  | "tecnico"
  | "perdido"
  | "avariado";

export type PushExternalOptions = {
  location: ExternalLocation;
  status?: "instalado" | "parado";
  technician?: string | null;
  clientName?: string | null;
};

const QR_LINK_RE = /produto\.myio\.com\.br\/([^?\s#]+)/i;
const RAW_CODE_RE = /^\d+(?:_\d+)+$/;

/** Filtra apenas QRs que pertencem à plataforma externa (link produto.myio.com.br ou código puro). */
function externalQrs(qrs: (string | null | undefined)[]): string[] {
  return Array.from(
    new Set(
      qrs
        .map((q) => q?.trim())
        .filter((q): q is string => !!q && (QR_LINK_RE.test(q) || RAW_CODE_RE.test(q))),
    ),
  );
}

/**
 * Envia a mudança de local para a plataforma externa (fire-and-forget).
 * Nunca bloqueia nem quebra o fluxo interno: falhas viram apenas um aviso.
 */
export function pushQrsToExternal(qrs: (string | null | undefined)[], opts: PushExternalOptions): void {
  const list = externalQrs(qrs);
  if (!list.length) return;
  void pushExternalQrLocations({
    data: {
      qrs: list,
      location: opts.location,
      status: opts.status ?? null,
      technician: opts.technician ?? null,
      clientName: opts.clientName ?? null,
    },
  })
    .then((r) => {
      const failed = r.results.filter((x) => !x.ok);
      if (failed.length) {
        toast.warning(`Plataforma externa: ${failed.length} QR code(s) não atualizados.`, {
          description: failed[0]?.error,
        });
      }
    })
    .catch((e) => {
      toast.warning("Não foi possível atualizar o local na plataforma externa.", {
        description: e instanceof Error ? e.message : undefined,
      });
    });
}

/**
 * Busca os QR codes vinculados à baixa de um pedido Myio e envia o novo local
 * para a plataforma externa. Silencioso em caso de falha — o sync periódico corrige.
 */
export function pushOrderToExternal(orderId: string, opts: PushExternalOptions): void {
  void (async () => {
    const { data: deliveries } = await supabase
      .from("myio_item_deliveries")
      .select("id, myio_delivery_qrs(qr_value)")
      .eq("order_id", orderId);
    const qrs = (deliveries ?? []).flatMap((d) =>
      ((d.myio_delivery_qrs ?? []) as { qr_value: string }[]).map((q) => q.qr_value),
    );
    pushQrsToExternal(qrs, opts);
  })().catch(() => {
    /* falha silenciosa: a sincronização periódica corrige */
  });
}

/** Pedidos já reconciliados nesta sessão (chave: orderId:local) — evita pushes repetidos. */
const reconciled = new Set<string>();

/**
 * Reenvia o local correto de pedidos inteiros (1x por sessão por pedido/local).
 * Corrige QR codes que ficaram sem atualização na plataforma externa
 * (ex.: baixas feitas antes da integração ou pushes que falharam).
 */
export function reconcileOrdersExternal(orderIds: string[], opts: PushExternalOptions): void {
  const fresh = orderIds.filter((id) => !reconciled.has(`${id}:${opts.location}`));
  if (!fresh.length) return;
  for (const id of fresh) {
    reconciled.add(`${id}:${opts.location}`);
    pushOrderToExternal(id, opts);
  }
}
