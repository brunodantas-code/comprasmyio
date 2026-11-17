import type { CSSProperties, ComponentProps } from "react";
import { useCdeStandards } from "./cde-button";
import { cn } from "@/lib/utils";

export type MarkerLook = { bg: string; text: string; border: string; shape: string; size: number; font: number };
export const MARKER_DEFAULTS: Record<string, MarkerLook> = {
  record_number: { bg: "black", text: "white", border: "none", shape: "circle", size: 22, font: 11 },
  alert_marker: { bg: "red", text: "white", border: "none", shape: "circle", size: 28, font: 12 },
};
export const MARKER_COLORS = [
  { key: "black", label: "Preto", value: "var(--code-completed)" },
  { key: "white", label: "Branco", value: "var(--code-completed-foreground)" },
  { key: "red", label: "Vermelho", value: "var(--destructive)" },
  { key: "green", label: "Verde myio", value: "var(--myio-green)" },
  { key: "soft", label: "Verde claro", value: "var(--cde-number-soft)" },
  { key: "gray", label: "Cinza", value: "var(--muted-foreground)" },
  { key: "purple", label: "Roxo myio", value: "var(--myio-purple)" },
  { key: "none", label: "Sem cor", value: "transparent" },
];
export function parseMarkerLook(raw: string | undefined, kind: string): MarkerLook {
  const fallback = MARKER_DEFAULTS[kind] ?? MARKER_DEFAULTS.record_number;
  try {
    const p = JSON.parse(raw ?? "{}");
    const color = (key: string) => MARKER_COLORS.some(c => c.key === p[key]) ? p[key] : fallback[key as "bg" | "text" | "border"];
    return { bg: color("bg"), text: color("text"), border: color("border"), shape: ["circle", "square", "rounded"].includes(p.shape) ? p.shape : fallback.shape, size: Number.isFinite(p.size) ? Math.min(48, Math.max(16, p.size)) : fallback.size, font: Number.isFinite(p.font) ? Math.min(20, Math.max(9, p.font)) : fallback.font };
  } catch { return fallback; }
}
export function markerVars(look: MarkerLook, value: string, fixedSize = false): CSSProperties {
  const color = (key: string) => MARKER_COLORS.find(c => c.key === key)?.value ?? "transparent";
  // Numeric identifiers are never truncated: grow the circle for longer identifiers.
  const diameter = fixedSize ? look.size : Math.max(look.size, Math.ceil(value.length * look.font * 0.65 + 8));
  const font = fixedSize ? Math.min(look.font, (diameter - 6) / Math.max(1, value.length * 0.65)) : look.font;
  return { "--marker-bg": color(look.bg), "--marker-text": color(look.text), "--marker-border": color(look.border), "--marker-size": `${diameter}px`, "--marker-font": `${font}px`, "--marker-radius": look.shape === "circle" ? "50%" : look.shape === "square" ? "0" : "4px" } as CSSProperties;
}
export function useMarkerLook(kind: string) {
  const { data } = useCdeStandards();
  return parseMarkerLook(data?.selected.find(s => s.group_key === kind && s.is_primary)?.variant_key, kind);
}
export function NumericMarker({ kind = "record_number", children, look, className, scale = 1, ...props }: ComponentProps<"span"> & { kind?: string; look?: MarkerLook; scale?: number }) {
  const saved = useMarkerLook(kind);
  const current = look ?? saved;
  return <span {...props} data-numeric-marker={kind} style={markerVars(current, String(children ?? ""), true)} className={cn("cde-numeric-marker", className)}>{children}</span>;
}
export function AlertMarker({ count, className, scale = 1, ...props }: ComponentProps<"span"> & { count: number; scale?: number }) {
  return <NumericMarker {...props} scale={scale} kind="alert_marker" className={className}>{count > 99 ? "99+" : count}</NumericMarker>;
}