import type { MytosisNode } from "./mytosis";

export type BoxFormat = {
  shape: string; fill_color: string; border_color: string;
  title_font_size: number; description_font_size: number;
  text_align: "left" | "center" | "right"; text_vertical_align: "top" | "center" | "bottom";
  title_color: string | null; control_color: string | null;
};

export const BUILTIN_FORMAT: BoxFormat = {
  shape: "process", fill_color: "none", border_color: "green-mid", title_font_size: 18, description_font_size: 11,
  text_align: "left", text_vertical_align: "center", title_color: null, control_color: null,
};

/** Normalizes the saved company default, falling back field by field to the built-in format. */
export function resolveDefaultFormat(raw: unknown): BoxFormat {
  const value = raw && typeof raw === "object" ? (raw as Partial<BoxFormat>) : {};
  const out = { ...BUILTIN_FORMAT };
  (Object.keys(BUILTIN_FORMAT) as (keyof BoxFormat)[]).forEach((key) => { if (value[key] !== undefined) (out as Record<string, unknown>)[key] = value[key]; });
  return out;
}

export function formatOf(node: Partial<BoxFormat>): BoxFormat {
  return resolveDefaultFormat(node);
}

export function sameFormat(a: BoxFormat, b: BoxFormat) {
  return (Object.keys(BUILTIN_FORMAT) as (keyof BoxFormat)[]).every((key) => (a[key] ?? null) === (b[key] ?? null));
}

export type ShapeFormats = Record<string, BoxFormat>;

export function resolveShapeFormats(raw: unknown, fallback: BoxFormat): ShapeFormats {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw).map(([shape, value]) => [shape, { ...fallback, ...resolveDefaultFormat(value), shape }]));
}

export function standardForShape(formats: ShapeFormats, fallback: BoxFormat, shape: string): BoxFormat {
  return { ...(formats[shape] ?? fallback), shape };
}

export function canEditBoxLayout(role: string | null) {
  return role === "admin";
}

export function initialStageFormat(nodes: MytosisNode[], editing: MytosisNode | null, sourceId?: string | null) {
  return editing ?? nodes.find((node) => node.id === sourceId);
}
