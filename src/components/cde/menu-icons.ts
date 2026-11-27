export const MENU_ICONS_GROUP = "menu_icons";
export const MENU_ICONS_QUERY = ["cde-menu-icons"] as const;
export type MenuIcons = Record<string, Record<string, string>>;
export const menuIconKey = (app: string, group: string) => `${app === "Finance" ? "Cash Flow" : app}|${group}`;

export function parseMenuIcons(raw?: string | null): MenuIcons {
  try {
    const parsed: unknown = JSON.parse(raw ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: MenuIcons = {};
    for (const [key, values] of Object.entries(parsed)) {
      if (!values || typeof values !== "object" || Array.isArray(values)) continue;
      result[key] = Object.fromEntries(Object.entries(values).filter((entry): entry is [string, string] => typeof entry[1] === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry[1])));
    }
    return result;
  } catch { return {}; }
}

export function resolveMenuIcon(icons: MenuIcons | undefined, app: string, group: string, identity: string) {
  return icons?.[menuIconKey(app, group)]?.[identity];
}

export function setMenuIcon(icons: MenuIcons, app: string, group: string, identity: string, icon: string): MenuIcons {
  const key = menuIconKey(app, group);
  const next = { ...icons[key] };
  if (icon) next[identity] = icon;
  else delete next[identity];
  return { ...icons, [key]: next };
}