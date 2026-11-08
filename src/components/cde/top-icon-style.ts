import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Style of the shared top-bar icons (Todos os apps, Menu). Stored in cde_selected group top_icon_style. */
export type TopIconStyle = { fg: string; bg: string; border: string; borderWidth: number; radius: number };
export const TOP_ICON_DEFAULT: TopIconStyle = { fg: "", bg: "", border: "", borderWidth: 0, radius: 6 };
export const TOP_ICON_GROUP = "top_icon_style";

export function parseTopIconStyle(raw?: string | null): TopIconStyle {
  try { return { ...TOP_ICON_DEFAULT, ...JSON.parse(raw ?? "{}") }; } catch { return TOP_ICON_DEFAULT; }
}
export function useTopIconStyle() {
  return useQuery({ queryKey: ["cde-top-icon-style"], queryFn: async () => {
    const { data } = await supabase.from("cde_selected").select("variant_key").eq("group_key", TOP_ICON_GROUP).eq("is_primary", true).maybeSingle();
    return parseTopIconStyle(data?.variant_key);
  } });
}
export function topIconVars(s: TopIconStyle): Record<string, string> {
  return {
    "--ti-fg": s.fg || "var(--foreground)",
    "--ti-bg": s.bg || "transparent",
    "--ti-bd": s.border || "var(--border)",
    "--ti-bw": `${s.borderWidth}px`,
    "--ti-r": `${s.radius}px`,
  };
}
/** Applies the saved style to every .top-icon on the page. */
export function TopIconStyleVars() {
  const { data } = useTopIconStyle();
  useEffect(() => {
    if (!data) return;
    const root = document.documentElement;
    Object.entries(topIconVars(data)).forEach(([k, v]) => root.style.setProperty(k, v));
  }, [data]);
  return null;
}
