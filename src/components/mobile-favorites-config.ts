import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PORTAL_APPS } from "@/components/cde/app-order-config";

export const FAVORITE_LIMIT = 4;
export const FAVORITE_APPS = PORTAL_APPS.map(app => ({ ...app, to: ({ supply: "/dashboard", cash_flow: "/cash-flow", crm: "/crm", legal: "/legal", rh: "/rh", site_survey: "/site-survey", chamados: "/chamados", development: "/development", mytosis: "/mytosis", wishlist: "/wishlist", projects: "/projects", cde: "/cde" } as const)[app.key] }));
export function normalizeFavorites(keys: string[], allowed: string[]): string[] {
  return [...new Set(keys)].filter(key => allowed.includes(key)).slice(0, FAVORITE_LIMIT);
}
export function toggleFavorite(keys: string[], key: string): string[] {
  return keys.includes(key) ? keys.filter(k => k !== key) : keys.length < FAVORITE_LIMIT ? [...keys, key] : keys;
}
export function useMobileFavorites() {
  return useQuery({ queryKey: ["mobile-app-favorites"], queryFn: async () => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!auth.user) return null;
    const id = auth.user.id;
    const [access, admin, mytosis, support, favorites] = await Promise.all([
      supabase.from("user_app_access").select("app_key").eq("user_id", id),
      supabase.from("erp_admins").select("user_id").eq("user_id", id).maybeSingle(),
      supabase.rpc("mytosis_role", { _user_id: id }),
      supabase.rpc("is_customer_support_analyst", { _user_id: id }),
      supabase.from("mobile_app_favorites").select("app_keys").eq("user_id", id).maybeSingle(),
    ]);
    for (const result of [access, admin, mytosis, support, favorites]) if (result.error) throw result.error;
    const allowed = [...new Set([...(access.data ?? []).map(a => a.app_key), ...(admin.data ? ["cde"] : []), ...(mytosis.data ? ["mytosis"] : []), ...(support.data ? ["chamados"] : [])])];
    return { id, allowed, keys: normalizeFavorites(favorites.data?.app_keys ?? [], allowed) };
  } });
}