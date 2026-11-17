import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Saved column orders per CDE table id: original header slot indexes in the chosen order. */
export type TableColumnOrders = Record<string, number[]>;
export const TABLE_ORDER_GROUP = "table_column_order";

export function parseTableColumnOrders(raw?: string | null): TableColumnOrders {
  try {
    const p = JSON.parse(raw ?? "{}");
    if (!p || typeof p !== "object" || Array.isArray(p)) return {};
    const out: TableColumnOrders = {};
    for (const [k, v] of Object.entries(p)) if (Array.isArray(v) && v.every((n) => Number.isInteger(n) && n >= 0)) out[k] = [...new Set(v as number[])];
    return out;
  } catch { return {}; }
}

/**
 * Positions to render, given the slot ids of the children actually present (conditional columns may be missing).
 * Slots absent from the saved order keep their original relative position after the ordered ones.
 */
export function columnPermutation(present: number[], saved?: number[]): number[] | null {
  if (!saved?.length) return null;
  const rank = (id: number) => { const r = saved.indexOf(id); return r < 0 ? saved.length + id : r; };
  const perm = present.map((_, i) => i).sort((a, b) => rank(present[a]) - rank(present[b]) || a - b);
  return perm.every((p, i) => p === i) ? null : perm;
}

export function useTableColumnOrders() {
  return useQuery({ queryKey: ["cde-table-column-order"], staleTime: 60_000, queryFn: async () => {
    const { data, error } = await supabase.from("cde_selected").select("variant_key").eq("group_key", TABLE_ORDER_GROUP).eq("is_primary", true).maybeSingle();
    if (error) throw error;
    return parseTableColumnOrders(data?.variant_key);
  } });
}
