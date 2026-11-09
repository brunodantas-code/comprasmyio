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
    const { data, error } = await supabase.rpc("public_app_order");
    if (error) throw error;
    return parseAppOrder(data ?? undefined);
  } });
}

/** Tile look of portal apps: label font (desktop px; mobile is 2px smaller) and icon size (% of tile icon box). */
export type AppTileConfig = { labelPx: number; iconPct: number; tilePct: number };
export const APP_TILE_DEFAULT: AppTileConfig = { labelPx: 14, iconPct: 100, tilePct: 100 };
/** Optical correction so glyphs with thin strokes or large inner padding look the same size as the others. */
export const APP_ICON_OPTICAL: Record<string, number> = { supply: 1.15, mytosis: 1.2, cde: 1.2 };
export function parseAppTile(raw?: string): AppTileConfig {
  try {
    const p = JSON.parse(raw ?? "{}");
    const labelPx = Number(p.labelPx), iconPct = Number(p.iconPct), tilePct = Number(p.tilePct);
    return { labelPx: labelPx >= 10 && labelPx <= 18 ? labelPx : APP_TILE_DEFAULT.labelPx, iconPct: iconPct >= 60 && iconPct <= 140 ? iconPct : APP_TILE_DEFAULT.iconPct, tilePct: tilePct >= 70 && tilePct <= 140 ? tilePct : APP_TILE_DEFAULT.tilePct };
  } catch { return APP_TILE_DEFAULT; }
}
export function useAppTile() {
  return useQuery({ queryKey: ["cde-app-tile"], queryFn: async () => {
    const { data, error } = await supabase.from("cde_selected").select("variant_key").eq("group_key", "app_tile").eq("is_primary", true).maybeSingle();
    if (error) throw error;
    return parseAppTile(data?.variant_key);
  } });
}
