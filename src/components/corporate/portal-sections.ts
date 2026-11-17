import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Blocks of the main page, ordered in CDE (cde_selected group portal_sections). */
export const PORTAL_SECTIONS = [
  { key: "messages", label: "Mensagens corporativas" },
  { key: "apps", label: "Ícones dos Apps" },
  { key: "todos", label: "To Dos" },
  { key: "pending", label: "Minhas pendências" },
] as const;
export type PortalSection = (typeof PORTAL_SECTIONS)[number]["key"];
export const DEFAULT_PORTAL_SECTIONS: PortalSection[] = PORTAL_SECTIONS.map((s) => s.key);
export const PORTAL_SECTIONS_GROUP = "portal_sections";

/** Saved order first; unknown keys dropped; blocks missing from the saved list keep default order at the end. */
export function parsePortalSections(raw?: string | null): PortalSection[] {
  try {
    const p = JSON.parse(raw ?? "[]");
    const saved = Array.isArray(p) ? p.filter((k): k is PortalSection => (DEFAULT_PORTAL_SECTIONS as string[]).includes(k)) : [];
    return [...new Set([...saved, ...DEFAULT_PORTAL_SECTIONS])];
  } catch { return DEFAULT_PORTAL_SECTIONS; }
}

export function usePortalSections() {
  return useQuery({ queryKey: ["cde-portal-sections"], queryFn: async () => {
    const { data, error } = await supabase.from("cde_selected").select("variant_key").eq("group_key", PORTAL_SECTIONS_GROUP).eq("is_primary", true).maybeSingle();
    if (error) throw error;
    return parsePortalSections(data?.variant_key);
  } });
}
