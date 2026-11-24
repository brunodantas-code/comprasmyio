import type { Json } from "@/integrations/supabase/types";

export const categoryChangeNeedsConfirmation = (suggested: string | null, chosen: string) => !!suggested && suggested !== chosen;

export function categoryChangeMessage(suggestedName: string, chosenName: string, hasObservation: boolean) {
  return `O nome do estabelecimento parece se referir a ${suggestedName}. Confirma a classificação como ${chosenName}?${hasObservation ? "" : "\n\nRegistre no campo de observações para facilitar o entendimento e contabilização."}`;
}

type LogLike = { details: Json; created_at: string };
const obj = (v: Json | undefined): Record<string, Json | undefined> | null => v && typeof v === "object" && !Array.isArray(v) ? v : null;

/** Latest recorded app suggestion vs. user's category for a receipt; null when unchanged or unknown. */
export function receiptCategoryOverride(logs: LogLike[], receiptId: string, currentCategory: string) {
  const entries = logs.map(l => { const d = obj(l.details); const src = d?.["receipt_id"] === receiptId ? (d?.["action"] === undefined && obj(d?.["after"]) ? obj(d?.["after"]) : d) : null; return { at: l.created_at, src }; })
    .filter(e => e.src && typeof e.src["suggested_category"] === "string").sort((a, b) => b.at.localeCompare(a.at));
  const suggested = entries[0]?.src?.["suggested_category"];
  return typeof suggested === "string" && suggested !== currentCategory ? { suggested, chosen: currentCategory } : null;
}
