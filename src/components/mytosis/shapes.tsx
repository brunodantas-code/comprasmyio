import type { CSSProperties } from "react";

export type ShapeKey = "process" | "terminal" | "document" | "decision" | "connector" | "io" | "multidoc" | "manual" | "preparation" | "or" | "delay";
export type FillKey = "none" | "green-soft" | "green-mid" | "green" | "purple-soft" | "purple-mid" | "purple" | "dark" | "gray";
export type BorderKey = "green-mid" | "green" | "purple-mid" | "purple" | "dark" | "gray";
export type LinkStyle = "arrow" | "line" | "dashed" | "double";

export const SHAPES: { key: ShapeKey; label: string }[] = [
  { key: "process", label: "Processo" },
  { key: "terminal", label: "Início/fim" },
  { key: "document", label: "Documento" },
  { key: "decision", label: "Decisão" },
  { key: "connector", label: "Conector" },
  { key: "io", label: "Entrada/saída" },
  { key: "multidoc", label: "Vários documentos" },
  { key: "manual", label: "Entrada manual" },
  { key: "preparation", label: "Preparação" },
  { key: "or", label: "OR" },
  { key: "delay", label: "Atraso" },
];

// Somente tons das cores do Manual da Marca myio (verde, roxo e escuro).
export const FILLS: { key: FillKey; label: string; color: string; dark?: boolean }[] = [
  { key: "none", label: "Sem fundo", color: "var(--card)" },
  { key: "green-soft", label: "Verde claro", color: "var(--mytosis-green-soft)" },
  { key: "green-mid", label: "Verde médio", color: "var(--mytosis-green-mid)" },
  { key: "green", label: "Verde myio", color: "var(--myio-green)" },
  { key: "purple-soft", label: "Roxo claro", color: "var(--mytosis-purple-soft)" },
  { key: "purple-mid", label: "Roxo médio", color: "var(--mytosis-purple-mid)" },
  { key: "purple", label: "Roxo myio", color: "var(--myio-purple)", dark: true },
  { key: "dark", label: "Escuro myio", color: "var(--myio-dark)", dark: true },
  { key: "gray", label: "Cinza", color: "var(--mytosis-gray)" },
];
export const BORDERS: { key: BorderKey; label: string; color: string }[] = [
  { key: "green-mid", label: "Verde claro", color: "var(--mytosis-green-mid)" },
  { key: "green", label: "Verde myio", color: "var(--myio-green)" },
  { key: "purple-mid", label: "Roxo claro", color: "var(--mytosis-purple-mid)" },
  { key: "purple", label: "Roxo myio", color: "var(--myio-purple)" },
  { key: "dark", label: "Escuro myio", color: "var(--myio-dark)" },
  { key: "gray", label: "Cinza", color: "var(--mytosis-gray-line)" },
];
export const LINK_STYLES: { key: LinkStyle; label: string }[] = [
  { key: "arrow", label: "Seta de fluxo" },
  { key: "line", label: "Linha" },
  { key: "dashed", label: "Tracejada" },
  { key: "double", label: "Seta dupla" },
];

export const fillOf = (k?: string | null) => FILLS.find((f) => f.key === k) ?? FILLS[0];
export const borderOf = (k?: string | null) => BORDERS.find((b) => b.key === k) ?? BORDERS[0];

/** Espaço interno do texto conforme a forma (losango e círculo têm menos área útil). */
export const shapeInset: Record<ShapeKey, CSSProperties> = {
  process: {}, terminal: { paddingInline: "10%" }, document: { paddingBottom: "12%" }, decision: { paddingInline: "22%", paddingBlock: "14%" },
  connector: { paddingInline: "16%", paddingBlock: "8%" }, io: { paddingInline: "12%" }, multidoc: { paddingTop: "12%", paddingRight: "14%", paddingBottom: "14%" },
  manual: { paddingTop: "12%" }, preparation: { paddingInline: "12%" }, or: { paddingInline: "18%", paddingBlock: "10%" }, delay: { paddingRight: "12%" },
};

/** Vertical percentage padding must use box height, not CSS's containing width. */
export function shapeContentInset(shape: ShapeKey, height: number): CSSProperties {
  const inset = { ...shapeInset[shape] };
  for (const key of ["paddingTop", "paddingBottom", "paddingBlock"] as const) {
    const value = inset[key];
    if (typeof value === "string" && value.endsWith("%")) inset[key] = height * parseFloat(value) / 100;
  }
  return inset;
}

function paths(shape: ShapeKey): string[] {
  switch (shape) {
    case "terminal": return ["M20 2 H80 A18 28 0 0 1 80 58 H20 A18 28 0 0 1 20 2 Z"];
    case "document": return ["M2 2 H98 V50 C75 40 60 66 30 54 C18 49 8 52 2 55 Z"];
    case "decision": return ["M50 2 L98 30 L50 58 L2 30 Z"];
    case "connector": return ["M50 2 A48 28 0 1 1 49.9 2 Z"];
    case "io": return ["M14 2 H98 L86 58 H2 Z"];
    case "multidoc": return ["M10 2 H98 V42 H92", "M6 6 H94 V46 H88", "M2 10 H90 V52 C70 44 55 64 30 56 C18 52 8 54 2 57 Z"];
    case "manual": return ["M2 18 L98 2 V58 H2 Z"];
    case "preparation": return ["M14 2 H86 L98 30 L86 58 H14 L2 30 Z"];
    case "or": return ["M50 2 A48 28 0 1 1 49.9 2 Z", "M50 2 V58", "M2 30 H98"];
    case "delay": return ["M2 2 H72 A26 28 0 0 1 72 58 H2 Z"];
    default: return ["M6 2 H94 A4 4 0 0 1 98 6 V54 A4 4 0 0 1 94 58 H6 A4 4 0 0 1 2 54 V6 A4 4 0 0 1 6 2 Z"];
  }
}

export function ShapeSvg({ shape, fill, stroke, strokeWidth = 1, className }: { shape: ShapeKey; fill: string; stroke: string; strokeWidth?: number; className?: string }) {
  const list = paths(shape);
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="none" className={className} aria-hidden>
      {list.map((d, i) => {
        const closed = d.trim().endsWith("Z");
        return <path key={i} d={d} fill={closed ? fill : "none"} stroke={stroke} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />;
      })}
    </svg>
  );
}

export function ConnectorGlyph({ style, color = "var(--mytosis-green-mid)", width = 28, height = 10 }: { style: LinkStyle; color?: string; width?: number; height?: number }) {
  const y = height / 2;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="shrink-0">
      <line x1={style === "double" ? 4 : 0} y1={y} x2={style === "line" || style === "dashed" ? width : width - 4} y2={y} stroke={color} strokeWidth={1.2} strokeDasharray={style === "dashed" ? "3 2" : undefined} />
      {style === "arrow" || style === "double" ? <path d={`M${width - 5} ${y - 3} L${width} ${y} L${width - 5} ${y + 3}`} fill="none" stroke={color} strokeWidth={1.2} /> : null}
      {style === "double" ? <path d={`M5 ${y - 3} L0 ${y} L5 ${y + 3}`} fill="none" stroke={color} strokeWidth={1.2} /> : null}
    </svg>
  );
}
