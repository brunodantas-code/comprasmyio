import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Edited card titles/subtitles, saved in cde_selected group title_text as JSON { "titulo|Original": "Novo" }. */
export const TITLE_TEXT_GROUP = "title_text";
export type TitleKind = "titulo" | "subtitulo";
export type TitleTexts = Record<string, string>;
export const titleKey = (kind: TitleKind, original: string) => `${kind}|${original.trim().replace(/\s+/g, " ")}`;
export function parseTitleTexts(raw?: string | null): TitleTexts {
  try { const p = JSON.parse(raw ?? "{}"); const out: TitleTexts = {}; for (const [k, v] of Object.entries(p ?? {})) if (typeof v === "string" && v.trim()) out[k] = v.trim(); return out; } catch { return {}; }
}
let state: TitleTexts = {}; let loading: Promise<void> | null = null; const subs = new Set<() => void>();
export async function refreshTitleTexts() {
  const { data } = await supabase.from("cde_selected").select("variant_key").eq("group_key", TITLE_TEXT_GROUP).eq("is_primary", true).maybeSingle();
  state = parseTitleTexts(data?.variant_key); subs.forEach((f) => f());
}
function subscribe(f: () => void) { subs.add(f); if (!loading && typeof window !== "undefined") loading = refreshTitleTexts().catch(() => {}); return () => { subs.delete(f); }; }
export function useTitleTexts(): TitleTexts { return useSyncExternalStore(subscribe, () => state, () => state); }
/** Plain-text children get the CDE replacement; anything else renders unchanged. */
export function useTitleText(kind: TitleKind, children: React.ReactNode): React.ReactNode {
  const texts = useTitleTexts();
  return typeof children === "string" ? texts[titleKey(kind, children)] ?? children : children;
}
