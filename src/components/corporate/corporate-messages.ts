import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CorporateMessage = { id: string; message: string; starts_at: string; ends_at: string | null; created_by: string; created_at: string; author?: string };

/** Local YYYY-MM-DD for comparing display dates. */
export function todayIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/** Shown from the display date through the inactivation date (inclusive); no end date = shown until inactivated. */
export function isMessageActive(m: Pick<CorporateMessage, "starts_at" | "ends_at">, today = todayIso()) {
  return m.starts_at <= today && (!m.ends_at || m.ends_at >= today);
}

export function useCorporateMessages() {
  return useQuery({ queryKey: ["corporate-messages"], queryFn: async () => {
    const { data, error } = await supabase.from("corporate_messages").select("id, message, starts_at, ends_at, created_by, created_at").order("starts_at", { ascending: false }).order("created_at", { ascending: false });
    if (error) throw error;
    const ids = [...new Set((data ?? []).map((m) => m.created_by))];
    const { data: people } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
    const names = new Map((people ?? []).map((p) => [p.id, p.full_name]));
    return (data ?? []).map((m) => ({ ...m, author: names.get(m.created_by) ?? "—" })) as CorporateMessage[];
  } });
}
