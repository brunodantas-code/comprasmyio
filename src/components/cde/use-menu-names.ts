import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MENU_NAMES_GROUP, MENU_NAMES_QUERY, parseMenuNames, resolveMenuName } from "./menu-names";

export function useMenuNames() {
  return useQuery({ queryKey: MENU_NAMES_QUERY, staleTime: 60_000, queryFn: async () => {
    const { data, error } = await supabase.from("cde_selected").select("variant_key").eq("group_key", MENU_NAMES_GROUP).eq("is_primary", true).maybeSingle();
    if (error) throw error;
    return parseMenuNames(data?.variant_key);
  } });
}

export function useMenuDisplayName(app: string, group: string) {
  const { data } = useMenuNames();
  return (id: string, fallback = id) => resolveMenuName(data, app, group, id, fallback);
}