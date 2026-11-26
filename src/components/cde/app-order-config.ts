import { parseFontFormat, fontFormatCss, type FontFormat } from "./font-format";
import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PORTAL_APPS = [
  { key: "supply", name: "Supply" },
  { key: "spend", name: "Spend" },
  { key: "cash_flow", name: "Finance" },
  { key: "crm", name: "CRM" },
  { key: "legal", name: "Legal" },
  { key: "rh", name: "RH" },
  { key: "site_survey", name: "Site Survey" },
  { key: "chamados", name: "OpDesk" },
  { key: "development", name: "Code" },
  { key: "mytosis", name: "Mytosis" },
  { key: "indicadores", name: "Indicadores" },
  { key: "wishlist", name: "Wishlist" },
  { key: "projects", name: "Projects" },
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
  headerBg: [
    { key: "padrao", label: "Atual: branco / verde claro", value: "var(--card)", dark: false },
    { key: "branco", label: "Branco", value: "var(--myio-white)", dark: false },
    { key: "verde_claro", label: "Verde claro myio", value: "var(--myio-green-tint)", dark: false },
    { key: "verde", label: "Verde myio", value: "var(--myio-green)", dark: false },
    { key: "lilas", label: "Lilás myio", value: "var(--myio-lilac)", dark: false },
    { key: "roxo", label: "Roxo myio", value: "var(--myio-purple)", dark: true },
    { key: "escuro", label: "Escuro myio", value: "var(--myio-dark)", dark: true },
    { key: "roxo_noite", label: "Roxo noite myio", value: "var(--erp-landing)", dark: true },
    { key: "roxo_profundo", label: "Roxo profundo myio", value: "var(--erp-landing-soft)", dark: true },
  ],
  bg: [
    { key: "padrao", label: "Cinza claro", value: "var(--background)", dark: false },
    { key: "branco", label: "Branco", value: "var(--myio-white)", dark: false },
    { key: "verde_claro", label: "Verde claro myio", value: "var(--myio-green-tint)", dark: false },
    { key: "lilas", label: "Lilás myio", value: "var(--myio-lilac)", dark: false },
    { key: "roxo", label: "Roxo myio", value: "var(--myio-purple)", dark: true },
    { key: "escuro", label: "Escuro myio", value: "var(--myio-dark)", dark: true },
    { key: "roxo_noite", label: "Roxo noite myio (tela de acesso)", value: "var(--erp-landing)", dark: true },
    { key: "roxo_profundo", label: "Roxo profundo myio (tela de acesso)", value: "var(--erp-landing-soft)", dark: true },
  ],
  fill: [
    { key: "padrao", label: "Verde myio", value: "var(--myio-green)", dark: false },
    { key: "roxo", label: "Roxo myio", value: "var(--myio-purple)", dark: true },
    { key: "escuro", label: "Escuro myio", value: "var(--myio-dark)", dark: true },
    { key: "branco", label: "Branco", value: "var(--myio-white)", dark: false },
    { key: "verde_claro", label: "Verde claro myio", value: "var(--myio-green-tint)", dark: false },
    { key: "lilas", label: "Lilás myio", value: "var(--myio-lilac)", dark: false },
    { key: "roxo_noite", label: "Roxo noite myio (tela de acesso)", value: "var(--erp-landing)", dark: true },
    { key: "roxo_profundo", label: "Roxo profundo myio (tela de acesso)", value: "var(--erp-landing-soft)", dark: true },
  ],
  border: [
    { key: "padrao", label: "Verde myio (igual ao ícone)", value: "var(--myio-green)", dark: false },
    { key: "escuro", label: "Escuro myio", value: "var(--myio-dark)", dark: true },
    { key: "roxo", label: "Roxo myio", value: "var(--myio-purple)", dark: true },
    { key: "branco", label: "Branco", value: "var(--myio-white)", dark: false },
    { key: "lilas", label: "Lilás myio", value: "var(--myio-lilac)", dark: false },
    { key: "roxo_noite", label: "Roxo noite myio (tela de acesso)", value: "var(--erp-landing)", dark: true },
    { key: "roxo_profundo", label: "Roxo profundo myio (tela de acesso)", value: "var(--erp-landing-soft)", dark: true },
  ],
  symbol: [
    { key: "padrao", label: "Escuro myio", value: "var(--myio-dark)", dark: true },
    { key: "branco", label: "Branco", value: "var(--myio-white)", dark: false },
    { key: "verde", label: "Verde myio", value: "var(--myio-green)", dark: false },
    { key: "roxo", label: "Roxo myio", value: "var(--myio-purple)", dark: true },
    { key: "lilas", label: "Lilás myio", value: "var(--myio-lilac)", dark: false },
    { key: "roxo_noite", label: "Roxo noite myio (tela de acesso)", value: "var(--erp-landing)", dark: true },
    { key: "roxo_profundo", label: "Roxo profundo myio (tela de acesso)", value: "var(--erp-landing-soft)", dark: true },
    { key: "lilas_suave", label: "Lilás suave myio (tela de acesso)", value: "var(--erp-landing-muted)", dark: false },
  ],
  inside: [
    { key: "padrao", label: "Escuro myio", value: "var(--myio-dark)", dark: true },
    { key: "branco", label: "Branco", value: "var(--myio-white)", dark: false },
    { key: "roxo", label: "Roxo myio", value: "var(--myio-purple)", dark: true },
    { key: "lilas_suave", label: "Lilás suave myio (tela de acesso)", value: "var(--erp-landing-muted)", dark: false },
  ],
  below: [
    { key: "padrao", label: "Cinza", value: "var(--muted-foreground)", dark: true },
    { key: "escuro", label: "Escuro myio", value: "var(--myio-dark)", dark: true },
    { key: "roxo", label: "Roxo myio", value: "var(--myio-purple)", dark: true },
    { key: "verde", label: "Verde myio", value: "var(--myio-green)", dark: false },
    { key: "branco", label: "Branco", value: "var(--myio-white)", dark: false },
    { key: "roxo_noite", label: "Roxo noite myio (tela de acesso)", value: "var(--erp-landing)", dark: true },
    { key: "roxo_profundo", label: "Roxo profundo myio (tela de acesso)", value: "var(--erp-landing-soft)", dark: true },
    { key: "lilas_suave", label: "Lilás suave myio (tela de acesso)", value: "var(--erp-landing-muted)", dark: false },
  ],
} as const;
export const APP_NAME_COLORS = [
  { key: "padrao", label: "Automática", value: "currentColor" },
  { key: "escuro", label: "Escuro myio", value: "var(--myio-dark)" },
  { key: "branco", label: "Branco", value: "var(--myio-white)" },
  { key: "verde", label: "Verde myio", value: "var(--myio-green)" },
  { key: "roxo", label: "Roxo myio", value: "var(--myio-purple)" },
  { key: "lilas", label: "Lilás myio", value: "var(--myio-lilac)" },
  { key: "cinza", label: "Cinza", value: "var(--muted-foreground)" },
] as const;
export type AppTileColorKind = keyof typeof APP_TILE_COLORS;
export type AppDisplayOverride = { format?: FontFormat; descriptionFormat?: FontFormat; name?: string; labelPx?: number; color?: string; description?: string; descriptionPx?: number; descriptionColor?: string };
export type AppDisplay = { format?: FontFormat; name: string; labelPx: number; colorKey: string; color?: string };
export type AppTileConfig = { format?: FontFormat; desktopHeaderPx?: number; appLogoPx?: number; labelPx: number; iconPct: number; tilePct: number; mobileTilePct: number; mobileIconPct: number; gapX: number; gapY: number; headerBg: string; bg: string; fill: string; border: string; symbol: string; inside: string; below: string; apps?: Record<string, AppDisplayOverride> };
export const APP_TILE_DEFAULT: AppTileConfig = { labelPx: 14, iconPct: 100, tilePct: 100, mobileTilePct: 100, mobileIconPct: 100, gapX: 32, gapY: 40, headerBg: "padrao", bg: "padrao", fill: "padrao", border: "padrao", symbol: "padrao", inside: "padrao", below: "padrao" };
export function appTileColor(kind: AppTileColorKind, key: string) {
  const list = APP_TILE_COLORS[kind] as readonly { key: string; label: string; value: string; dark: boolean }[];
  return list.find((o) => o.key === key) ?? list[0];
}
/** Portal key of an app shown by name; names saved in the CDE are recognised when the config is supplied. */
export function appKeyForName(name: string, tile?: AppTileConfig): string {
  const wanted = name.trim().toLowerCase();
  if (wanted === "cash flow") return "cash_flow";
  const saved = tile?.apps ? Object.entries(tile.apps).find(([, option]) => option?.name?.trim().toLowerCase() === wanted)?.[0] : undefined;
  if (saved && PORTAL_APPS.some(app => app.key === saved)) return saved;
  return PORTAL_APPS.find(app => app.name.toLowerCase() === wanted)?.key ?? name;
}
/**
 * Display name of an app written by key ("indicadores") or by any of its labels ("Indicadores").
 * The name saved in CDE → Home Page always wins, so every screen follows the same choice.
 */
export function useAppDisplayName() {
  const tile = useAppTile().data ?? APP_TILE_DEFAULT;
  return useCallback((keyOrLabel: string) => appDisplay(tile, appKeyForName(keyOrLabel, tile)).name, [tile]);
}
/** Logo height used by every app header; defaults to the Home logo (40 px). */
export const APP_LOGO_DEFAULT_PX = 40;
export function appLogoPx(tile: AppTileConfig): number { return tile.appLogoPx ?? APP_LOGO_DEFAULT_PX; }
export function appDisplay(tile: AppTileConfig, key: string, fallbackPx = tile.labelPx, fallbackName?: string): AppDisplay {
  const original = PORTAL_APPS.find(app => app.key === key)?.name ?? fallbackName ?? key;
  const saved = tile.apps?.[key];
  const colorKey = APP_NAME_COLORS.some(option => option.key === saved?.color) ? saved?.color ?? "padrao" : "padrao";
  const color = APP_NAME_COLORS.find(option => option.key === colorKey)?.value;
  return { ...((saved?.format ?? tile.format) ? { format: saved?.format ?? tile.format } : {}), name: saved?.name?.trim() || original, labelPx: saved?.labelPx ?? fallbackPx, colorKey, ...(colorKey !== "padrao" && color ? { color } : {}) };
}
/** Portal CSS variables for the chosen colours (background, tile border, text inside and below the tiles). */
export function appTileColorVars(tile: AppTileConfig): Record<string, string> {
  return { "--portal-bg": appTileColor("bg", tile.bg).value, "--tile-fill": appTileColor("fill", tile.fill).value, "--tile-border": appTileColor("border", tile.border).value, "--tile-symbol": appTileColor("symbol", tile.symbol).value, "--tile-inside": appTileColor("inside", tile.inside).value, "--tile-below": appTileColor("below", tile.below).value };
}
export function homeHeaderVars(tile: AppTileConfig): Record<string, string> {
  const selected = appTileColor("headerBg", tile.headerBg);
  const height: Record<string, string> = tile.desktopHeaderPx ? { "--home-header-desktop-height": `${tile.desktopHeaderPx}px` } : {};
  if (selected.key === "padrao") return height;
  const foreground = selected.dark ? "var(--myio-white)" : "var(--myio-dark)";
  return { ...height, "--home-header-bg": selected.value, "--home-header-text": foreground, "--home-header-muted": selected.dark ? "var(--myio-white)" : "var(--muted-foreground)", "--foreground": foreground, "--ti-fg": foreground };
}
export function homeHeaderLogoTone(tile: AppTileConfig, mobile = false): "auto" | "light" | "dark" {
  const selected = appTileColor("headerBg", tile.headerBg);
  return selected.key === "padrao" ? (mobile ? "light" : "auto") : selected.dark ? "light" : "dark";
}
export function mobileTileVars(tile: AppTileConfig): Record<string, string> {
  return { "--mobile-tile-size": `${80 * tile.mobileTilePct / 100}px`, "--mobile-symbol-box": `${44 * tile.mobileTilePct / 100}px`, "--mobile-grid-min": tile.mobileTilePct > 100 ? `${80 * tile.mobileTilePct / 100}px` : "calc((100% - 1.5rem) / 4)" };
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
    const mobileTilePct = Number(p.mobileTilePct), mobileIconPct = Number(p.mobileIconPct);
    const gapX = Number(p.gapX), gapY = Number(p.gapY);
    const rawApps: Record<string, unknown> = p.apps && typeof p.apps === "object" && !Array.isArray(p.apps) ? p.apps as Record<string, unknown> : {};
    const apps: Record<string, AppDisplayOverride> = {};
    for (const app of PORTAL_APPS) {
      const raw = rawApps[app.key];
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const value = raw as Record<string, unknown>;
      const name = typeof value.name === "string" ? value.name.trim().slice(0, 30) : "";
      const appLabelPx = Number(value.labelPx), color = String(value.color ?? "");
      const parsed: AppDisplayOverride = { ...(value["format"] ? { format: parseFontFormat(value["format"]) } : {}), ...(value["descriptionFormat"] ? { descriptionFormat: parseFontFormat(value["descriptionFormat"]) } : {}) };
      if (name) parsed.name = name;
      if (Number.isFinite(appLabelPx) && appLabelPx >= 10 && appLabelPx <= 32) parsed.labelPx = appLabelPx;
      if (APP_NAME_COLORS.some(option => option.key === color)) parsed.color = color;
      if (typeof value.description === "string") parsed.description = value.description;
      const descriptionPx = Number(value.descriptionPx);
      if (Number.isFinite(descriptionPx) && descriptionPx >= 10 && descriptionPx <= 32) parsed.descriptionPx = descriptionPx;
      if (APP_NAME_COLORS.some(option => option.key === value.descriptionColor)) parsed.descriptionColor = String(value.descriptionColor);
      if (Object.keys(parsed).length) apps[app.key] = parsed;
    }
    return { ...(p.format ? { format: parseFontFormat(p.format) } : {}), labelPx: labelPx >= 10 && labelPx <= 18 ? labelPx : APP_TILE_DEFAULT.labelPx, iconPct: iconPct >= 60 && iconPct <= 140 ? iconPct : APP_TILE_DEFAULT.iconPct, tilePct: tilePct >= 70 && tilePct <= 140 ? tilePct : APP_TILE_DEFAULT.tilePct,
      mobileTilePct: mobileTilePct >= 70 && mobileTilePct <= 140 ? mobileTilePct : APP_TILE_DEFAULT.mobileTilePct,
      mobileIconPct: mobileIconPct >= 60 && mobileIconPct <= 140 ? mobileIconPct : (iconPct >= 60 && iconPct <= 140 ? iconPct : APP_TILE_DEFAULT.mobileIconPct),
      gapX: Number.isFinite(gapX) && gapX >= 8 && gapX <= 80 ? gapX : APP_TILE_DEFAULT.gapX,
      gapY: Number.isFinite(gapY) && gapY >= 8 && gapY <= 80 ? gapY : APP_TILE_DEFAULT.gapY,
      ...(Number(p.appLogoPx) >= 24 && Number(p.appLogoPx) <= 64 ? { appLogoPx: Number(p.appLogoPx) } : {}),
      ...(Number(p.desktopHeaderPx) >= 80 && Number(p.desktopHeaderPx) <= 240 ? { desktopHeaderPx: Number(p.desktopHeaderPx) } : {}),
      headerBg: appTileColor("headerBg", String(p.headerBg ?? "")).key,
      bg: appTileColor("bg", String(p.bg ?? "")).key, fill: appTileColor("fill", String(p.fill ?? "")).key, border: appTileColor("border", String(p.border ?? "")).key,
      symbol: appTileColor("symbol", String(p.symbol ?? "")).key, inside: appTileColor("inside", String(p.inside ?? "")).key, below: appTileColor("below", String(p.below ?? "")).key,
      ...(Object.keys(apps).length ? { apps } : {}) };
  } catch { return APP_TILE_DEFAULT; }
}
export function useAppTile() {
  return useQuery({ queryKey: ["cde-app-tile"], queryFn: async () => {
    const { data, error } = await supabase.from("cde_selected").select("variant_key").eq("group_key", "app_tile").eq("is_primary", true).maybeSingle();
    if (error) throw error;
    return parseAppTile(data?.variant_key);
  } });
}
