import { parseFontFormat, fontFormatVars, type FontFormat } from "./font-format";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { tagColor } from "./tag-style";

/** Look of the CDE itself (group cde_appearance): category headers and subcategory bands. "padrao" keeps today's look. */
export const CDE_APPEARANCE_GROUP = "cde_appearance";
export const CDE_FONTS = [
  { key: "padrao", label: "Nunito", value: "" },
  { key: "sistema", label: "Sistema", value: "ui-sans-serif, system-ui, sans-serif" },
  { key: "serifa", label: "Serifada", value: "Georgia, 'Times New Roman', serif" },
  { key: "mono", label: "Monoespaçada", value: "ui-monospace, Menlo, monospace" },
] as const;
export const CDE_SIZES = [11, 12, 13, 14, 15, 16, 18, 20] as const;
export type CdeLevel = { bg: string; text: string; border: string; hint: string; titlePx: number; hintPx: number; font: string; titleFormat?: FontFormat; hintFormat?: FontFormat };
export type CdeAppearanceConfig = { cat: CdeLevel; sub: CdeLevel };
export const CDE_APPEARANCE_DEFAULT: CdeAppearanceConfig = {
  cat: { bg: "padrao", text: "padrao", border: "padrao", hint: "padrao", titlePx: 14, hintPx: 12, font: "padrao" },
  sub: { bg: "padrao", text: "padrao", border: "padrao", hint: "padrao", titlePx: 14, hintPx: 12, font: "padrao" },
};
/** Named inherited tokens keep legacy saved colours intact without a visible default choice. */
export const CDE_INHERITED_COLORS = {
  cat: {
    bg: { key: "transparente", label: "Sem cor", value: "transparent" },
    border: { key: "cde_border", label: "Cinza claro", value: "var(--border)" },
    text: { key: "cde_text", label: "Escuro", value: "var(--foreground)" },
    hint: { key: "cinza_texto", label: "Cinza (texto)", value: "var(--muted-foreground)" },
  },
  sub: {
    bg: { key: "cde_section_bg", label: "Verde claro", value: "var(--erp-section-head)" },
    border: { key: "cde_border", label: "Cinza claro", value: "var(--border)" },
    text: { key: "cde_text", label: "Escuro", value: "var(--foreground)" },
    hint: { key: "cinza_texto", label: "Cinza (texto)", value: "var(--muted-foreground)" },
  },
} as const;
function level(p: unknown, d: CdeLevel): CdeLevel {
  const o = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
  const col = (v: unknown) => tagColor(typeof v === "string" ? v : undefined).key;
  const px = (v: unknown, dv: number) => ((CDE_SIZES as readonly number[]).includes(Number(v)) ? Number(v) : dv);
  return { titleFormat: parseFontFormat(o["titleFormat"]), hintFormat: parseFontFormat(o["hintFormat"]), bg: col(o.bg), text: col(o.text), border: col(o.border), hint: col(o.hint), titlePx: px(o.titlePx, d.titlePx), hintPx: px(o.hintPx, d.hintPx), font: CDE_FONTS.some((f) => f.key === o.font) ? String(o.font) : "padrao" };
}
export function parseCdeAppearance(raw?: string | null): CdeAppearanceConfig {
  try { const p = JSON.parse(raw ?? "{}") ?? {}; return { cat: level(p.cat, CDE_APPEARANCE_DEFAULT.cat), sub: level(p.sub, CDE_APPEARANCE_DEFAULT.sub) }; } catch { return CDE_APPEARANCE_DEFAULT; }
}
/** CSS variables read by .cde-cat-* / .cde-sub-* (styles.css); unset keys fall back to today's look. */
export function cdeAppearanceVars(c: CdeAppearanceConfig): React.CSSProperties {
  const out: Record<string, string> = {};
  for (const [lv, l] of [["cat", c.cat], ["sub", c.sub]] as const) {
    const put = (name: string, key: string) => { if (key !== "padrao") out[`--cde-${lv}-${name}`] = tagColor(key).value; };
    Object.assign(out, fontFormatVars(`--cde-${lv}-title`, l.titleFormat), fontFormatVars(`--cde-${lv}-hint`, l.hintFormat));
    if (!l.titleFormat?.weight && lv === "sub") out["--cde-sub-title-weight"] = "600";
    put("bg", l.bg); put("text", l.text); put("border", l.border); put("hint-color", l.hint);
    out[`--cde-${lv}-title-fs`] = `${l.titlePx}px`; out[`--cde-${lv}-hint-fs`] = `${l.hintPx}px`;
    if (lv === "sub") out["--cde-section-title-fs"] = `${l.titlePx}px`;
    const f = CDE_FONTS.find((x) => x.key === l.font)?.value; if (f) out[`--cde-${lv}-font`] = f;
  }
  return out as React.CSSProperties;
}
export function useCdeAppearance() {
  return useQuery({ queryKey: ["cde-appearance"], queryFn: async () => {
    const { data, error } = await supabase.from("cde_selected").select("variant_key").eq("group_key", CDE_APPEARANCE_GROUP).eq("is_primary", true).maybeSingle();
    if (error) throw error; return parseCdeAppearance(data?.variant_key);
  } });
}
