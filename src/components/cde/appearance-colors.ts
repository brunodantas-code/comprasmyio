import { converter, formatCss, parse } from "culori";

export type AppAppearance = "green" | "purple" | "grayscale";
export const APP_APPEARANCE_GROUP = "app_appearance";
export const APP_APPEARANCES = [
  { key: "purple", label: "Roxo myio" },
  { key: "green", label: "Verde myio" },
  { key: "grayscale", label: "P&B (grayscale)" },
] as const;
export function parseAppAppearance(raw: unknown): AppAppearance | null {
  return raw === "green" || raw === "purple" || raw === "grayscale" ? raw : null;
}
const toOklch = converter("oklch");
const BASES = { green: toOklch("#0fc482"), purple: toOklch("#673ab6") };
/** Always convert the original colour, never the previous display conversion. */
export function convertAppearanceColor(value: string, appearance: AppAppearance): string {
  const parsed = parse(value);
  if (!parsed) return value;
  const color = toOklch(parsed);
  if (appearance === "grayscale") return formatCss({ ...color, c: 0 });
  const minChroma = color.l >= 0.85 ? 0.004 : 0.025;
  if (color.h === undefined || color.c < minChroma || color.l < 0.2) return value;
  const source = color.h >= 100 && color.h <= 185 ? BASES.green
    : color.h >= 265 && color.h <= 330 ? BASES.purple : undefined;
  const target = BASES[appearance];
  if (!source || !target) return value;
  const shade = color.l >= source.l ? (color.l - source.l) / (1 - source.l) : (color.l - source.l) / source.l;
  const l = shade >= 0 ? target.l + shade * (1 - target.l) : target.l * (1 + shade);
  let c = color.c * target.c / source.c;
  // Very light green tints must read as a visible light lilac, not near-white.
  if (appearance === "purple" && l >= 0.85) c = Math.max(c, Math.min(0.04, (1 - l) * 0.6));
  return formatCss({ ...color, l, c, h: target.h });
}
