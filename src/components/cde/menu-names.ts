import { wrapMenuIcon } from "./menu-icon";
/** Display names never replace the original menu identity used for order/access. */
export type MenuNames = Record<string, Record<string, string>>;
export const MENU_NAMES_GROUP = "menu_names";
export const MENU_NAMES_QUERY = ["cde-menu-names"] as const;
export const menuNameKey = (app: string, group: string) => `${app === "Finance" ? "Cash Flow" : app}|${group}`;

export function parseMenuNames(raw?: string | null): MenuNames {
  try {
    const parsed: unknown = JSON.parse(raw ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: MenuNames = {};
    for (const [key, values] of Object.entries(parsed)) {
      if (!values || typeof values !== "object" || Array.isArray(values)) continue;
      const names: Record<string, string> = {};
      for (const [id, value] of Object.entries(values)) {
        if (typeof value === "string" && value.trim()) names[id] = value.trim();
      }
      result[key] = names;
    }
    return result;
  } catch { return {}; }
}

export function resolveMenuName(names: MenuNames | undefined, app: string, group: string, id: string, fallback = id): string {
  return names?.[menuNameKey(app, group)]?.[id] ?? fallback;
}

export function applyMenuNames<T extends { label: string }>(items: T[], names: MenuNames | undefined, app: string, group: string): T[] {
  return items.map(item => ({ ...item, ...("icon" in item ? { icon: wrapMenuIcon(item.icon, app, group, item.label) } : {}), label: resolveMenuName(names, app, group, item.label) }));
}