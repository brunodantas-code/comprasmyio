import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { APP_TILE_COLORS } from "@/components/cde/app-order-config";

/** Corporate message look, saved in cde_selected group message_style; colours reuse the brand palette offered for app tiles. */
export const MESSAGE_STYLE_GROUP = "message_style";
export type MessageColorOption = { key: string; label: string; value: string };
export const BRAND: MessageColorOption[] = (() => {
  const seen = new Map<string, MessageColorOption>();
  for (const list of Object.values(APP_TILE_COLORS)) for (const o of list) {
    if (o.value === "var(--background)" || o.value === "var(--muted-foreground)") continue;
    const key = o.label.replace(/ \(.*\)$/, "").replace(/ myio$/, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "_");
    if (![...seen.values()].some((v) => v.value === o.value)) seen.set(key, { key, label: o.label.replace(" (igual ao ícone)", ""), value: o.value });
  }
  return [...seen.values()];
})();
export const withDefault = (label: string, value: string) => [{ key: "padrao", label, value }, ...BRAND.filter((o) => o.value !== value)];
export const MESSAGE_COLORS = {
  fill: withDefault("Verde claro myio", "var(--myio-green-tint)"),
  border: withDefault("Verde myio suave", "color-mix(in srgb, var(--myio-green) 40%, transparent)"),
  symbol: withDefault("Verde myio", "var(--myio-green)"),
  text: withDefault("Escuro myio", "var(--myio-dark)"),
} as const;
export type MessageColorKind = keyof typeof MESSAGE_COLORS;
export type MessageStyle = Record<MessageColorKind, string>;
export const MESSAGE_STYLE_DEFAULT: MessageStyle = { fill: "padrao", border: "padrao", symbol: "padrao", text: "padrao" };
export function messageColor(kind: MessageColorKind, key: string): MessageColorOption {
  const list = MESSAGE_COLORS[kind] as readonly MessageColorOption[];
  return list.find((o) => o.key === key) ?? list[0];
}
export function parseMessageStyle(raw?: string | null): MessageStyle {
  try {
    const p = JSON.parse(raw ?? "{}") ?? {};
    return { fill: messageColor("fill", String(p.fill ?? "")).key, border: messageColor("border", String(p.border ?? "")).key, symbol: messageColor("symbol", String(p.symbol ?? "")).key, text: messageColor("text", String(p.text ?? "")).key };
  } catch { return MESSAGE_STYLE_DEFAULT; }
}
export function messageStyleCss(s: MessageStyle) {
  return { background: messageColor("fill", s.fill).value, borderColor: messageColor("border", s.border).value, color: messageColor("text", s.text).value, symbol: messageColor("symbol", s.symbol).value };
}
export function useMessageStyle() {
  return useQuery({ queryKey: ["cde-message-style"], queryFn: async () => {
    const { data, error } = await supabase.from("cde_selected").select("variant_key").eq("group_key", MESSAGE_STYLE_GROUP).eq("is_primary", true).maybeSingle();
    if (error) throw error;
    return parseMessageStyle(data?.variant_key);
  } });
}
