import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Saved icon order per app menu: { "Supply|Barra inferior": ["Approvals", ...] }. Stored in cde_selected group menu_order. */
export type MenuOrders = Record<string, string[]>;
export const MENU_ORDER_GROUP = "menu_order";
export const menuKey = (app: string, group: string) => `${app}|${group}`;

export function parseMenuOrders(raw?: string | null): MenuOrders {
  try { const v = JSON.parse(raw ?? "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}
export function useMenuOrders() {
  return useQuery({ queryKey: ["cde-menu-order"], staleTime: 60_000, queryFn: async () => {
    const { data } = await supabase.from("cde_selected").select("variant_key").eq("group_key", MENU_ORDER_GROUP).eq("is_primary", true).maybeSingle();
    return parseMenuOrders(data?.variant_key);
  } });
}
/** Sorts by saved label order; unknown labels keep their original relative order at the end. */
export function sortByMenuOrder<T extends { label: string }>(items: T[], order?: string[]): T[] {
  if (!order?.length) return items;
  const pos = (l: string) => { const i = order.indexOf(l); return i < 0 ? order.length : i; };
  return items.map((it, i) => ({ it, i })).sort((a, b) => pos(a.it.label) - pos(b.it.label) || a.i - b.i).map((x) => x.it);
}
export function useOrderedMenu<T extends { label: string }>(app: string, group: string, items: T[]): T[] {
  const { data } = useMenuOrders();
  return sortByMenuOrder(items, data?.[menuKey(app, group)]);
}
