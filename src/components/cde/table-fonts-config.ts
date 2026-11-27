import { parseFontFormat, fontFormatVars, type FontFormat } from "./font-format";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type MessageColorOption } from "@/components/corporate/message-style";
import { COLOR_PALETTE, paletteExtras, withDefault } from "./color-palette";
import { tagColor } from "./tag-style";

/** Font standard for table headers and filter bars, customizable in the CDE (group table_fonts). */
export type AlignH = "left" | "center" | "right";
export type AlignV = "top" | "middle" | "bottom";
export const ALIGN_H: { key: AlignH; label: string }[] = [{ key: "left", label: "À esquerda" }, { key: "center", label: "Centralizado" }, { key: "right", label: "À direita" }];
export const ALIGN_V: { key: AlignV; label: string }[] = [{ key: "top", label: "No topo" }, { key: "middle", label: "Centralizado" }, { key: "bottom", label: "Na base" }];
/** Headers and list rows align independently; screens with an explicit alignment class keep it. */
/** Header colours use the single CDE palette; "padrao" keeps today's look and no colour is offered twice. */
const BG_HEAD = [{ key: "padrao", label: "Sem fundo", value: "transparent" }, { key: "cinza_claro", label: "Cinza claro", value: "color-mix(in oklab, var(--muted) 50%, transparent)" }, { key: "cinza_escuro", label: "Cinza escuro", value: "oklch(0.86 0 0)" }] as const;
const NO_BORDER = [{ key: "padrao", label: "Sem borda", value: "transparent" }] as const;
const FIELD_TITLE = [{ key: "padrao", label: "Sem cor", value: "" }, ...COLOR_PALETTE.filter((o) => o.key !== "transparente")] as const;
export const HEADER_COLORS = {
  headerBg: [...BG_HEAD, ...paletteExtras(BG_HEAD)],
  headerText: withDefault("Cinza (texto)", "var(--muted-foreground)"),
  headerBorder: withDefault("Cinza da borda", "var(--border)"),
  cellBg: [...BG_HEAD, ...paletteExtras(BG_HEAD)],
  cellText: withDefault("Texto", "var(--foreground)"),
  cellBorder: withDefault("Cinza da borda", "var(--border)"),
  titleBg: [...BG_HEAD, ...paletteExtras(BG_HEAD)],
  titleText: withDefault("Texto", "var(--foreground)"),
  titleBorder: [...NO_BORDER, ...paletteExtras(NO_BORDER)],
  subBg: [...BG_HEAD, ...paletteExtras(BG_HEAD)],
  subText: withDefault("Cinza (texto)", "var(--muted-foreground)"),
  subBorder: [...NO_BORDER, ...paletteExtras(NO_BORDER)],
  fieldBg: FIELD_TITLE,
  fieldText: FIELD_TITLE,
  fieldBorder: FIELD_TITLE,
} as const;
export type HeaderColorKind = keyof typeof HEADER_COLORS;
export const headerColor = (kind: HeaderColorKind, key: string): MessageColorOption => (HEADER_COLORS[kind] as readonly MessageColorOption[]).find((o) => o.key === key) ?? HEADER_COLORS[kind][0];
export type TableFontsConfig = { fieldPx?: number; cellPx?: number; headerFormat?: FontFormat; filterFormat?: FontFormat; cellFormat?: FontFormat; titleFormat?: FontFormat; subFormat?: FontFormat; fieldFormat?: FontFormat;  fieldBg: string; fieldText: string; fieldBorder: string; headerPx: number; filterPx: number; titlePx: number; subPx: number; headerH: AlignH; headerV: AlignV; cellH: AlignH; cellV: AlignV; headerBg: string; headerText: string; headerBorder: string; cellBg: string; cellText: string; cellBorder: string; titleBg: string; titleText: string; titleBorder: string; subBg: string; subText: string; subBorder: string };
export const TABLE_FONTS_DEFAULT: TableFontsConfig = { cellPx: 12, titleFormat: { weight: "600" }, subFormat: { weight: "400" }, fieldBg: "padrao", fieldText: "padrao", fieldBorder: "padrao", headerPx: 11, filterPx: 12, titlePx: 16, subPx: 14, headerH: "left", headerV: "middle", cellH: "left", cellV: "middle", headerBg: "padrao", headerText: "padrao", headerBorder: "padrao", cellBg: "padrao", cellText: "padrao", cellBorder: "padrao", titleBg: "padrao", titleText: "padrao", titleBorder: "padrao", subBg: "padrao", subText: "padrao", subBorder: "padrao" };
const pickH = (v: unknown, d: AlignH): AlignH => (ALIGN_H.some((o) => o.key === v) ? (v as AlignH) : d);
const pickV = (v: unknown, d: AlignV): AlignV => (ALIGN_V.some((o) => o.key === v) ? (v as AlignV) : d);
const JUSTIFY: Record<AlignH, string> = { left: "flex-start", center: "center", right: "flex-end" };
/** CSS variables read by .cde-th / .cde-td (styles.css). */
export function tableAlignVars(c: TableFontsConfig): Record<string, string> {
  const decorated = [c.fieldBg, c.fieldBorder].some((key) => key !== "padrao" && key !== "transparente");
  return { ...fontFormatVars("--th", c.headerFormat), ...fontFormatVars("--filter", c.filterFormat), ...fontFormatVars("--td", c.cellFormat), ...fontFormatVars("--title", c.titleFormat), ...fontFormatVars("--sub", c.subFormat), ...fontFormatVars("--field-title", c.fieldFormat), "--field-title-fs": c.fieldPx === undefined ? "inherit" : `${c.fieldPx}px`, "--td-fs": `${c.cellPx ?? 12}px`, "--title-fs": `${c.titlePx}px`, "--sub-fs": `${c.subPx}px`, "--field-title-bg": tagColor(c.fieldBg).value || "transparent", "--field-title-color": tagColor(c.fieldText).value || "inherit", "--field-title-border": tagColor(c.fieldBorder).value || "transparent", "--field-title-border-width": c.fieldBorder !== "padrao" && c.fieldBorder !== "transparente" ? "1px" : "0px", "--field-title-padding": decorated ? "2px 8px" : "0px", "--field-title-radius": decorated ? "6px" : "0px", "--th-bg": headerColor("headerBg", c.headerBg).value, "--th-color": headerColor("headerText", c.headerText).value, "--th-border": headerColor("headerBorder", c.headerBorder).value, "--td-bg": headerColor("cellBg", c.cellBg).value, "--td-color": headerColor("cellText", c.cellText).value, "--td-border": headerColor("cellBorder", c.cellBorder).value, "--title-bg": headerColor("titleBg", c.titleBg).value, "--title-color": headerColor("titleText", c.titleText).value, "--title-border": headerColor("titleBorder", c.titleBorder).value, "--sub-bg": headerColor("subBg", c.subBg).value, "--sub-color": headerColor("subText", c.subText).value, "--sub-border": headerColor("subBorder", c.subBorder).value, "--th-align": c.headerH, "--th-valign": c.headerV, "--th-justify": JUSTIFY[c.headerH], "--td-align": c.cellH, "--td-valign": c.cellV, "--td-justify": JUSTIFY[c.cellH] };
}
export const TABLE_HEADER_SIZES = [10, 11, 12, 13, 14] as const;
export const TABLE_FILTER_SIZES = [11, 12, 13, 14] as const;
/** Tamanhos oferecidos para títulos e subtítulos das telas (CDE Cabeçalhos e Listas). */
export const TITLE_SIZES = [12, 14, 16, 18, 20, 24] as const;
export const FIELD_TITLE_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24] as const;
export const SUBTITLE_SIZES = [10, 11, 12, 13, 14, 16] as const;

export function parseTableFonts(raw?: string | null): TableFontsConfig {
  try {
    const p = JSON.parse(raw ?? "{}");
    const headerPx = Number(p.headerPx);
    const filterPx = Number(p.filterPx);
    const cellPx = Number(p.cellPx);
    const titlePx = Number(p.titlePx);
    const subPx = Number(p.subPx);
    const fieldPx = Number(p.fieldPx);
    return {
      ...((FIELD_TITLE_SIZES as readonly number[]).includes(fieldPx) ? { fieldPx } : {}),
      headerFormat: parseFontFormat(p.headerFormat), filterFormat: parseFontFormat(p.filterFormat), cellFormat: parseFontFormat(p.cellFormat), titleFormat: parseFontFormat(p.titleFormat ?? TABLE_FONTS_DEFAULT.titleFormat), subFormat: parseFontFormat(p.subFormat ?? TABLE_FONTS_DEFAULT.subFormat), fieldFormat: parseFontFormat(p.fieldFormat),
      fieldBg: tagColor(p.fieldBg).key, fieldText: tagColor(p.fieldText).key, fieldBorder: tagColor(p.fieldBorder).key,
      headerPx: (TABLE_HEADER_SIZES as readonly number[]).includes(headerPx) ? headerPx : TABLE_FONTS_DEFAULT.headerPx,
      cellPx: (TABLE_FILTER_SIZES as readonly number[]).includes(cellPx) ? cellPx : 12,
      filterPx: (TABLE_FILTER_SIZES as readonly number[]).includes(filterPx) ? filterPx : TABLE_FONTS_DEFAULT.filterPx,
      titlePx: (TITLE_SIZES as readonly number[]).includes(titlePx) ? titlePx : TABLE_FONTS_DEFAULT.titlePx,
      subPx: (SUBTITLE_SIZES as readonly number[]).includes(subPx) ? subPx : TABLE_FONTS_DEFAULT.subPx,
      headerH: pickH(p.headerH, TABLE_FONTS_DEFAULT.headerH), headerV: pickV(p.headerV, TABLE_FONTS_DEFAULT.headerV),
      cellH: pickH(p.cellH, TABLE_FONTS_DEFAULT.cellH), cellV: pickV(p.cellV, TABLE_FONTS_DEFAULT.cellV),
      headerBg: headerColor("headerBg", String(p.headerBg ?? "")).key, headerText: headerColor("headerText", String(p.headerText ?? "")).key, headerBorder: headerColor("headerBorder", String(p.headerBorder ?? "")).key,
      cellBg: headerColor("cellBg", String(p.cellBg ?? "")).key, cellText: headerColor("cellText", String(p.cellText ?? "")).key, cellBorder: headerColor("cellBorder", String(p.cellBorder ?? "")).key,
      ...Object.fromEntries((["titleBg", "titleText", "titleBorder", "subBg", "subText", "subBorder"] as const).map((k) => [k, headerColor(k, String(p[k] ?? "")).key])) as Pick<TableFontsConfig, "titleBg" | "titleText" | "titleBorder" | "subBg" | "subText" | "subBorder">,
    };
  } catch {
    return TABLE_FONTS_DEFAULT;
  }
}

export function useTableFonts() {
  return useQuery({
    queryKey: ["cde-table-fonts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cde_selected").select("variant_key").eq("group_key", "table_fonts").eq("is_primary", true).maybeSingle();
      if (error) throw error;
      return parseTableFonts(data?.variant_key);
    },
  });
}

/** Applies the saved CDE standard to the CSS variables read by table headers (--th-fs) and filter bars (--filter-fs). */
export function useApplyTableFonts() {
  const { data } = useTableFonts();
  const cfg = data ?? TABLE_FONTS_DEFAULT;
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--th-fs", `${cfg.headerPx}px`);
    root.style.setProperty("--filter-fs", `${cfg.filterPx}px`);
    for (const [k, v] of Object.entries(tableAlignVars(cfg))) root.style.setProperty(k, v);
  }, [cfg.fieldPx, cfg.cellPx, cfg.headerFormat, cfg.filterFormat, cfg.cellFormat, cfg.titleFormat, cfg.subFormat, cfg.fieldFormat, cfg.fieldBg, cfg.fieldText, cfg.fieldBorder, cfg.headerPx, cfg.filterPx, cfg.titlePx, cfg.subPx, cfg.headerH, cfg.headerV, cfg.cellH, cfg.cellV, cfg.headerBg, cfg.headerText, cfg.headerBorder, cfg.cellBg, cfg.cellText, cfg.cellBorder, cfg.titleBg, cfg.titleText, cfg.titleBorder, cfg.subBg, cfg.subText, cfg.subBorder]);
}
