import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PORTAL_APPS = [
  { key: "supply", name: "Supply" },
  { key: "cash_flow", name: "Cash Flow" },
  { key: "crm", name: "CRM" },
  { key: "legal", name: "Legal" },
  { key: "rh", name: "RH" },
  { key: "site_survey", name: "Site Survey" },
  { key: "chamados", name: "OpDesk" },
  { key: "development", name: "Code" },
  { key: "mytosis", name: "Mytosis" },
  { key: "cde", name: "CDE" },
] as const;
const DEFAULT = PORTAL_APPS.map((a) => a.key as string);

/** Saved order first; unknown keys dropped; apps missing from the saved list keep default order at the end. */
export function parseAppOrder(raw?: string): string[] {
  try {
    const parsed = JSON.parse(raw ?? "[]");
    const saved = Array.isArray(parsed) ? parsed.filter((k): k is string => DEFAULT.includes(k)) : [];
    return [...new Set([...saved, ...DEFAULT])];
  } catch { return DEFAULT; }
}
export function useAppOrder() {
  return useQuery({ queryKey: ["cde-app-order"], queryFn: async () => {
    const { data, error } = await supabase.from("cde_selected").select("variant_key").eq("group_key", "app_order").eq("is_primary", true).maybeSingle();
    if (error) throw error;
    return parseAppOrder(data?.variant_key);
  } });
}
