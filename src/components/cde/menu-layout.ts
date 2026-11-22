export const MENU_TYPES = [
  { key: "floating", label: "Menu flutuante" },
  { key: "bottom", label: "Barra inferior" },
  { key: "top_tabs", label: "Menu superior" },
  { key: "left", label: "Menu lateral esquerdo" },
  { key: "right", label: "Menu lateral direito" },
] as const;
export type MenuType = typeof MENU_TYPES[number]["key"];
export type DeviceMenus = { mobile: MenuType; desktop: MenuType };
export type MenuConfig = Record<string, unknown>;
const valid = (v: unknown): v is MenuType => MENU_TYPES.some(t => t.key === v);
export function resolveMenus(config: MenuConfig, app: string): DeviceMenus {
  const key = app === "Finance" ? "Cash Flow" : app;
  const global = config["*"];
  const defaults: DeviceMenus = { mobile: "floating", desktop: "floating" };
  if (global && typeof global === "object") {
    const g = global as Record<string, unknown>;
    if (valid(g["mobile"])) defaults.mobile = g["mobile"];
    if (valid(g["desktop"])) defaults.desktop = g["desktop"];
  }
  const entry = config[key];
  if (typeof entry === "string") return { mobile: defaults.mobile, desktop: entry === "bottom" || entry === "bottom_fab" ? "floating" : valid(entry) ? entry : defaults.desktop };
  if (entry && typeof entry === "object") {
    const e = entry as Record<string, unknown>;
    return { mobile: valid(e["mobile"]) ? e["mobile"] : defaults.mobile, desktop: valid(e["desktop"]) ? e["desktop"] : defaults.desktop };
  }
  return defaults;
}
export function menuMainClasses({ mobile, desktop }: DeviceMenus) {
  const main = (t: MenuType, p: string) => t === "left" ? `${p}!pl-[var(--app-menu-side-offset)] ${p}!pb-8` : t === "right" ? `${p}!pr-[var(--app-menu-side-offset)] ${p}!pb-8` : t === "top_tabs" ? `${p}!pt-28 ${p}!pb-8` : "";
  return `${main(mobile, "max-lg:")} ${main(desktop, "lg:")}`;
}