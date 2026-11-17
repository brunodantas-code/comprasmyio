import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Font standard for table headers and filter bars, customizable in the CDE (group table_fonts). */
export type AlignH = "left" | "center" | "right";
export type AlignV = "top" | "middle" | "bottom";
export const ALIGN_H: { key: AlignH; label: string }[] = [{ key: "left", label: "À esquerda" }, { key: "center", label: "Centralizado" }, { key: "right", label: "À direita" }];
export const ALIGN_V: { key: AlignV; label: string }[] = [{ key: "top", label: "No topo" }, { key: "middle", label: "Centralizado" }, { key: "bottom", label: "Na base" }];
/** Headers and list rows align independently; screens with an explicit alignment class keep it. */
export type TableFontsConfig = { headerPx: number; filterPx: number; headerH: AlignH; headerV: AlignV; cellH: AlignH; cellV: AlignV };
export const TABLE_FONTS_DEFAULT: TableFontsConfig = { headerPx: 11, filterPx: 12, headerH: "left", headerV: "middle", cellH: "left", cellV: "middle" };
const pickH = (v: unknown, d: AlignH): AlignH => (ALIGN_H.some((o) => o.key === v) ? (v as AlignH) : d);
const pickV = (v: unknown, d: AlignV): AlignV => (ALIGN_V.some((o) => o.key === v) ? (v as AlignV) : d);
const JUSTIFY: Record<AlignH, string> = { left: "flex-start", center: "center", right: "flex-end" };
/** CSS variables read by .cde-th / .cde-td (styles.css). */
export function tableAlignVars(c: TableFontsConfig): Record<string, string> {
  return { "--th-align": c.headerH, "--th-valign": c.headerV, "--th-justify": JUSTIFY[c.headerH], "--td-align": c.cellH, "--td-valign": c.cellV, "--td-justify": JUSTIFY[c.cellH] };
}
export const TABLE_HEADER_SIZES = [10, 11, 12, 13, 14] as const;
export const TABLE_FILTER_SIZES = [11, 12, 13, 14] as const;

export function parseTableFonts(raw?: string | null): TableFontsConfig {
  try {
    const p = JSON.parse(raw ?? "{}");
    const headerPx = Number(p.headerPx);
    const filterPx = Number(p.filterPx);
    return {
      headerPx: (TABLE_HEADER_SIZES as readonly number[]).includes(headerPx) ? headerPx : TABLE_FONTS_DEFAULT.headerPx,
      filterPx: (TABLE_FILTER_SIZES as readonly number[]).includes(filterPx) ? filterPx : TABLE_FONTS_DEFAULT.filterPx,
      headerH: pickH(p.headerH, TABLE_FONTS_DEFAULT.headerH), headerV: pickV(p.headerV, TABLE_FONTS_DEFAULT.headerV),
      cellH: pickH(p.cellH, TABLE_FONTS_DEFAULT.cellH), cellV: pickV(p.cellV, TABLE_FONTS_DEFAULT.cellV),
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
  }, [cfg.headerPx, cfg.filterPx, cfg.headerH, cfg.headerV, cfg.cellH, cfg.cellV]);
}
