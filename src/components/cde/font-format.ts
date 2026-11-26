import type { CSSProperties } from "react";

export type FontFormat = { weight?: "400" | "600" | "700"; italic?: boolean; underline?: boolean };
export function parseFontFormat(value: unknown): FontFormat {
  const p = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    ...(["400", "600", "700"].includes(String(p["weight"])) ? { weight: String(p["weight"]) as "400" | "600" | "700" } : {}),
    ...(typeof p["italic"] === "boolean" ? { italic: p["italic"] } : {}),
    ...(typeof p["underline"] === "boolean" ? { underline: p["underline"] } : {}),
  };
}
export function fontFormatCss(value?: FontFormat): CSSProperties {
  return { ...(value?.weight ? { fontWeight: value.weight } : {}), ...(value?.italic !== undefined ? { fontStyle: value.italic ? "italic" : "normal" } : {}), ...(value?.underline !== undefined ? { textDecorationLine: value.underline ? "underline" : "none" } : {}) };
}
export function fontFormatVars(prefix: string, value?: FontFormat): Record<string, string> {
  return { [`${prefix}-weight`]: value?.weight ?? "inherit", [`${prefix}-style`]: value?.italic ? "italic" : "normal", [`${prefix}-decoration`]: value?.underline ? "underline" : "none" };
}