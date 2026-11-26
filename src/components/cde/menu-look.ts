import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { colorOption, withDefault, type ColorOption } from "@/components/cde/color-palette";

/**
 * Look of the app navigation (cde_selected group menu_look): panel background,
 * item text, selected item and the panel border/shadow. Colours come only from
 * the single CDE palette, and the type of menu (floating, bottom, side...) stays
 * per app in item 8 — this group never changes which menu an app uses.
 */
export const MENU_LOOK_GROUP = "menu_look";

/** Picker lists: the first entry is the look used today, then the palette once. */
export const MENU_LOOK_COLORS = {
  background: withDefault("Verde (atual)", "var(--primary)"),
  text: withDefault("Branco (atual)", "var(--myio-white)"),
  selected: withDefault("Verde claro", "var(--dropdown-highlight)"),
  selectedText: withDefault("Texto escuro", "var(--dropdown-highlight-foreground)"),
} as const;

export type MenuLookKind = keyof typeof MENU_LOOK_COLORS;

export const MENU_LOOK_BORDERS = [
  { key: "padrao", label: "Sem borda" },
  { key: "cinza", label: "Cinza clara" },
] as const;

export const MENU_LOOK_SHADOWS = [
  { key: "padrao", label: "Sem sombra" },
  { key: "suave", label: "Sombra suave" },
  { key: "destacada", label: "Sombra destacada" },
] as const;

export type MenuLookBorder = (typeof MENU_LOOK_BORDERS)[number]["key"];
export type MenuLookShadow = (typeof MENU_LOOK_SHADOWS)[number]["key"];

export type MenuLook = {
  background: string;
  text: string;
  selected: string;
  selectedText: string;
  border: MenuLookBorder;
  shadow: MenuLookShadow;
  sideWidth: number | null;
  flexible: boolean;
  buttonHeight: number;
};

export const MENU_LOOK_DEFAULT: MenuLook = {
  background: "padrao",
  text: "padrao",
  selected: "padrao",
  selectedText: "padrao",
  border: "padrao",
  shadow: "padrao",
  sideWidth: null,
  flexible: false,
  buttonHeight: 44,
};

/** Resolve a saved colour key inside its own picker list (the default entry holds today's value). */
export function menuLookColor(kind: MenuLookKind, key: string): ColorOption {
  const list = MENU_LOOK_COLORS[kind] as readonly ColorOption[];
  return list.find((o) => o.key === key) ?? list[0];
}

const borderKey = (v: unknown): MenuLookBorder => (MENU_LOOK_BORDERS.some((b) => b.key === v) ? (v as MenuLookBorder) : "padrao");
const shadowKey = (v: unknown): MenuLookShadow => (MENU_LOOK_SHADOWS.some((s) => s.key === v) ? (v as MenuLookShadow) : "padrao");
const measure = (value: unknown, fallback: number, min: number, max: number) => typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : fallback;

export function parseMenuLook(raw?: string | null): MenuLook {
  try {
    const p = (JSON.parse(raw ?? "{}") ?? {}) as Record<string, unknown>;
    return {
      background: menuLookColor("background", String(p.background ?? "")).key,
      text: menuLookColor("text", String(p.text ?? "")).key,
      selected: menuLookColor("selected", String(p.selected ?? "")).key,
      selectedText: menuLookColor("selectedText", String(p.selectedText ?? "")).key,
      border: borderKey(p.border),
      shadow: shadowKey(p.shadow),
      sideWidth: typeof p.sideWidth === "number" ? measure(p.sideWidth, 240, 160, 400) : null,
      flexible: p.flexible === true,
      buttonHeight: measure(p.buttonHeight, 44, 36, 80),
    };
  } catch {
    return MENU_LOOK_DEFAULT;
  }
}

/**
 * CSS variables read by the shared navigation (styles.css). Unset keys keep the
 * look used today, so nothing saved before this group existed changes appearance.
 */
export function menuLookVars(look: MenuLook): React.CSSProperties {
  const out: Record<string, string> = {};
  const put = (name: string, kind: MenuLookKind) => {
    const value = menuLookColor(kind, look[kind]).value;
    if (value) out[`--app-menu-fixed-${name}`] = value;
  };
  put("background", "background");
  put("foreground", "text");
  put("selected", "selected");
  put("selected-foreground", "selectedText");
  if (look.sideWidth !== null) out["--app-menu-side-custom-width"] = `${look.sideWidth}px`;
  out["--app-menu-side-button-height"] = `${look.buttonHeight}px`;
  if (look.border === "cinza") out["--app-menu-fixed-border"] = "1px solid var(--border)";
  if (look.shadow === "suave") out["--app-menu-fixed-shadow"] = "0 8px 24px rgb(0 0 0 / 0.12)";
  if (look.shadow === "destacada") out["--app-menu-fixed-shadow"] = "0 18px 45px rgb(0 0 0 / 0.28)";
  return out as React.CSSProperties;
}

/** Border/shadow as plain CSS, so the CDE preview can show the same look. */
export function menuLookBox(look: MenuLook): React.CSSProperties {
  const vars = menuLookVars(look) as Record<string, string>;
  return {
    border: vars["--app-menu-fixed-border"] ?? "0",
    boxShadow: vars["--app-menu-fixed-shadow"] ?? "none",
  };
}

export function useMenuLook() {
  return useQuery({
    queryKey: ["cde-menu-look"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cde_selected")
        .select("variant_key")
        .eq("group_key", MENU_LOOK_GROUP)
        .eq("is_primary", true)
        .maybeSingle();
      if (error) throw error;
      return parseMenuLook(data?.variant_key);
    },
  });
}

/** Kept for editors that list palette entries directly. */
export const menuLookPalette = (kind: MenuLookKind) => MENU_LOOK_COLORS[kind] as readonly ColorOption[];
export { colorOption };
