import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Font standard for table headers and filter bars, customizable in the CDE (group table_fonts). */
export type TableFontsConfig = { headerPx: number; filterPx: number };
export const TABLE_FONTS_DEFAULT: TableFontsConfig = { headerPx: 11, filterPx: 12 };
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
  }, [cfg.headerPx, cfg.filterPx]);
}
