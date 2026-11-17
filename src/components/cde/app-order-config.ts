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
  { key: "wishlist", name: "Wishlist" },
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
/** Brand-manual colour choices for the portal (keys stored; values are myio brand tokens only). */
export const APP_TILE_COLORS = {
  bg: [
    { key: "padrao", label: "Cinza claro", value: "var(--background)", dark: false },
    { key: "branco", label: "Branco", value: "var(--myio-white)", dark: false },
    { key: "verde_claro", label: "Verde claro myio", value: "var(--myio-green-tint)", dark: false },
    { key: "escuro", label: "Escuro myio", value: "var(--myio-dark)", dark: true },
  ],
  border: [
    { key: "padrao", label: "Verde myio (igual ao ícone)", value: "var(--myio-green)", dark: false },
    { key: "escuro", label: "Escuro myio", value: "var(--myio-dark)", dark: true },
    { key: "roxo", label: "Roxo myio", value: "var(--myio-purple)", dark: true },
    { key: "branco", label: "Branco", value: "var(--myio-white)", dark: false },
  ],
  inside: [
    { key: "padrao", label: "Escuro myio", value: "var(--myio-dark)", dark: true },
    { key: "branco", label: "Branco", value: "var(--myio-white)", dark: false },
  ],
  below: [
    { key: "padrao", label: "Cinza", value: "var(--muted-foreground)", dark: true },
    { key: "escuro", label: "Escuro myio", value: "var(--myio-dark)", dark: true },
    { key: "roxo", label: "Roxo myio", value: "var(--myio-purple)", dark: true },
    { key: "verde", label: "Verde myio", value: "var(--myio-green)", dark: false },
    { key: "branco", label: "Branco", value: "var(--myio-white)", dark: false },
  ],
} as const;
export type AppTileColorKind = keyof typeof APP_TILE_COLORS;
export type AppTileConfig = { labelPx: number; iconPct: number; tilePct: number; gapX: number; gapY: number; bg: string; border: string; inside: string; below: string };
export const APP_TILE_DEFAULT: AppTileConfig = { labelPx: 14, iconPct: 100, tilePct: 100, gapX: 32, gapY: 40, bg: "padrao", border: "padrao", inside: "padrao", below: "padrao" };
export function appTileColor(kind: AppTileColorKind, key: string) {
  const list = APP_TILE_COLORS[kind] as readonly { key: string; label: string; value: string; dark: boolean }[];
  return list.find((o) => o.key === key) ?? list[0];
}
/** Portal CSS variables for the chosen colours (background, tile border, text inside and below the tiles). */
export function appTileColorVars(tile: AppTileConfig): Record<string, string> {
  return { "--portal-bg": appTileColor("bg", tile.bg).value, "--tile-border": appTileColor("border", tile.border).value, "--tile-inside": appTileColor("inside", tile.inside).value, "--tile-below": appTileColor("below", tile.below).value };
}
/** True when the description text would vanish on the chosen background (same light/dark side). */
export function appTileLowContrast(tile: AppTileConfig) {
  return appTileColor("bg", tile.bg).dark === appTileColor("below", tile.below).dark;
}
/** Optical correction so glyphs with thin strokes or large inner padding look the same size as the others. */
export const APP_ICON_OPTICAL: Record<string, number> = { supply: 1.15, mytosis: 1.2, cde: 1.2 };
export function parseAppTile(raw?: string): AppTileConfig {
  try {
    const p = JSON.parse(raw ?? "{}");
    const labelPx = Number(p.labelPx), iconPct = Number(p.iconPct), tilePct = Number(p.tilePct);
    const gapX = Number(p.gapX), gapY = Number(p.gapY);
    return { labelPx: labelPx >= 10 && labelPx <= 18 ? labelPx : APP_TILE_DEFAULT.labelPx, iconPct: iconPct >= 60 && iconPct <= 140 ? iconPct : APP_TILE_DEFAULT.iconPct, tilePct: tilePct >= 70 && tilePct <= 140 ? tilePct : APP_TILE_DEFAULT.tilePct,
      gapX: Number.isFinite(gapX) && gapX >= 8 && gapX <= 80 ? gapX : APP_TILE_DEFAULT.gapX,
      gapY: Number.isFinite(gapY) && gapY >= 8 && gapY <= 80 ? gapY : APP_TILE_DEFAULT.gapY,
      bg: appTileColor("bg", String(p.bg ?? "")).key, border: appTileColor("border", String(p.border ?? "")).key,
      inside: appTileColor("inside", String(p.inside ?? "")).key, below: appTileColor("below", String(p.below ?? "")).key };
  } catch { return APP_TILE_DEFAULT; }
}
export function useAppTile() {
  return useQuery({ queryKey: ["cde-app-tile"], queryFn: async () => {
    const { data, error } = await supabase.from("cde_selected").select("variant_key").eq("group_key", "app_tile").eq("is_primary", true).maybeSingle();
    if (error) throw error;
    return parseAppTile(data?.variant_key);
  } });
}
