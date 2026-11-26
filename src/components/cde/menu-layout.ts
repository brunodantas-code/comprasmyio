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
  // Os utilitários precisam aparecer inteiros no código: o Tailwind só gera as
  // classes que lê literalmente, então as variantes (max-lg:/lg:) são escritas por
  // extenso. Com o nome montado por interpolação, o deslocamento não era gerado e
  // o menu lateral cobria as listas.
  const offsets: Record<string, { mobile: string; desktop: string }> = {
    left: { mobile: "max-lg:!pl-[var(--erp-side-offset,0px)]", desktop: "lg:!pl-[var(--erp-side-offset,0px)]" },
    right: { mobile: "max-lg:!pr-[var(--erp-side-offset,0px)]", desktop: "lg:!pr-[var(--erp-side-offset,0px)]" },
    top_tabs: { mobile: "max-lg:!pt-28", desktop: "lg:!pt-28" },
  };
  const bottoms: Record<string, { mobile: string; desktop: string }> = {
    left: { mobile: "max-lg:!pb-8", desktop: "lg:!pb-8" },
    right: { mobile: "max-lg:!pb-8", desktop: "lg:!pb-8" },
    top_tabs: { mobile: "max-lg:!pb-8", desktop: "lg:!pb-8" },
  };
  const parts: string[] = [];
  const m = offsets[mobile];
  if (m) parts.push(m.mobile, bottoms[mobile].mobile);
  const d = offsets[desktop];
  if (d) parts.push(d.desktop, bottoms[desktop].desktop);
  return parts.join(" ");
}