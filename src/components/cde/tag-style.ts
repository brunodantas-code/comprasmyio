import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BRAND, type MessageColorOption } from "@/components/corporate/message-style";

/** Per-tag look (background, text, border) saved in cde_selected group tag_style as JSON { [tagKey]: { bg, text, border } }; "padrao" keeps the current look. */
export const TAG_STYLE_GROUP = "tag_style";
export type TagPart = "bg" | "text" | "border";
export type TagLook = Partial<Record<TagPart, string>>;
export type TagStyles = Record<string, TagLook>;

export const TAG_COLORS: MessageColorOption[] = [
  { key: "padrao", label: "Atual (padrão)", value: "" },
  { key: "transparente", label: "Sem cor", value: "transparent" },
  { key: "branco", label: "Branco", value: "var(--background)" },
  { key: "cinza_claro", label: "Cinza claro", value: "color-mix(in oklab, var(--muted) 50%, transparent)" },
  { key: "cinza_escuro", label: "Cinza escuro", value: "oklch(0.86 0 0)" },
  { key: "cinza_texto", label: "Cinza (texto)", value: "var(--muted-foreground)" },
  { key: "preto", label: "Preto", value: "var(--foreground)" },
  { key: "vermelho", label: "Vermelho", value: "var(--destructive)" },
  ...BRAND.filter((o) => !["transparent", "var(--foreground)", "var(--destructive)"].includes(o.value)),
];
export const tagColor = (key?: string) => TAG_COLORS.find((o) => o.key === key) ?? TAG_COLORS[0];

/** Same label = same tag in every app (case/space-insensitive). */
export const tagKey = (label: string) => label.trim().replace(/\s+/g, " ").toLowerCase();

export function parseTagStyles(raw?: string | null): TagStyles {
  try {
    const p = JSON.parse(raw ?? "{}");
    if (!p || typeof p !== "object") return {};
    const out: TagStyles = {};
    for (const [k, v] of Object.entries(p as Record<string, TagLook>)) {
      const look: TagLook = {};
      for (const part of ["bg", "text", "border"] as TagPart[]) { const c = v?.[part]; if (c && c !== "padrao" && TAG_COLORS.some((o) => o.key === c)) look[part] = c; }
      if (Object.keys(look).length) out[tagKey(k)] = look;
    }
    return out;
  } catch { return {}; }
}

/** Inline CSS for a tag look; empty object when every part is "padrao". */
export function tagCss(look?: TagLook): React.CSSProperties {
  if (!look) return {};
  const css: React.CSSProperties = {};
  if (look.bg) css.backgroundColor = tagColor(look.bg).value;
  if (look.text) css.color = tagColor(look.text).value;
  if (look.border) css.borderColor = tagColor(look.border).value;
  return css;
}

let state: TagStyles = {};
let raw: string | null = null;
let loading: Promise<void> | null = null;
const subs = new Set<() => void>();
export async function refreshTagStyles() {
  const { data } = await supabase.from("cde_selected").select("variant_key").eq("group_key", TAG_STYLE_GROUP).eq("is_primary", true).maybeSingle();
  raw = data?.variant_key ?? null; state = parseTagStyles(raw); subs.forEach((f) => f());
}
function subscribe(f: () => void) { subs.add(f); if (!loading && typeof window !== "undefined") loading = refreshTagStyles().catch(() => {}); return () => { subs.delete(f); }; }
export function useTagStyles(): TagStyles { return useSyncExternalStore(subscribe, () => state, () => state); }
export const savedTagStylesRaw = () => raw;
