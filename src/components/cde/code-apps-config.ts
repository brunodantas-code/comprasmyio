import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PORTAL_APPS } from "./app-order-config";

/** Legacy app keys that may exist on older Code tickets but are no longer portal apps. */
const LEGACY_CODE_APPS: Record<string, string> = { rh: "RH" };

/**
 * Code serves every portal app unless CDE explicitly excludes it (cde_selected group code_apps stores
 * {"excluded":[keys]}). Storing exclusions, not inclusions, makes newly created apps appear automatically.
 */
export function parseCodeAppExclusions(raw?: string | null): string[] {
  try { const parsed = JSON.parse(raw ?? "{}"); return Array.isArray(parsed?.excluded) ? parsed.excluded.filter((k: unknown): k is string => typeof k === "string") : []; } catch { return []; }
}
export function codeApps(excluded: string[]) {
  return PORTAL_APPS.filter((a) => !excluded.includes(a.key)).map((a) => ({ key: a.key as string, name: a.name as string }));
}
export function codeAppName(key: string) {
  return PORTAL_APPS.find((a) => a.key === key)?.name ?? LEGACY_CODE_APPS[key] ?? key;
}
export function useCodeAppExclusions() {
  return useQuery({ queryKey: ["cde-code-apps"], queryFn: async () => {
    const { data, error } = await supabase.from("cde_selected").select("variant_key").eq("group_key", "code_apps").eq("is_primary", true).maybeSingle();
    if (error) throw error;
    return parseCodeAppExclusions(data?.variant_key);
  } });
}
