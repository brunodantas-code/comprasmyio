import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Column names edited in the CDE: per CDE table id, original header slot index → edited name. */
export type TableColumnNames = Record<string, Record<string, string>>;
export const TABLE_NAMES_GROUP = "table_column_names";
export const TABLE_NAMES_QUERY = ["cde-table-column-names"];

export function parseTableColumnNames(raw?: string | null): TableColumnNames {
  try {
    const p = JSON.parse(raw ?? "{}");
    if (!p || typeof p !== "object" || Array.isArray(p)) return {};
    const out: TableColumnNames = {};
    for (const [table, bySlot] of Object.entries(p)) {
      if (!bySlot || typeof bySlot !== "object" || Array.isArray(bySlot)) continue;
      const clean: Record<string, string> = {};
      for (const [slot, name] of Object.entries(bySlot)) {
        if (!/^\d+$/.test(slot)) continue;
        if (typeof name !== "string" || !name.trim()) continue;
        clean[slot] = name.trim();
      }
      if (Object.keys(clean).length) out[table] = clean;
    }
    return out;
  } catch { return {}; }
}

/**
 * Writes the edited name into a header cell, keeping any control it already holds
 * (filter or sort) and only replacing the plain text the editor shows.
 */
export function applyColumnName(cell: Element | null | undefined, name?: string): boolean {
  if (!name) return false;
  let target: Text | null = null;
  for (const node of Array.from(cell?.childNodes ?? [])) {
    if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim()) { target = node as Text; break; }
  }
  if (!target) return false;
  if (target.textContent === name) return false;
  target.textContent = name;
  return true;
}

export function useTableColumnNames() {
  return useQuery({ queryKey: TABLE_NAMES_QUERY, staleTime: 60_000, queryFn: async () => {
    const { data, error } = await supabase.from("cde_selected").select("variant_key").eq("group_key", TABLE_NAMES_GROUP).eq("is_primary", true).maybeSingle();
    if (error) throw error;
    return parseTableColumnNames(data?.variant_key);
  } });
}
