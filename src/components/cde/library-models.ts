export function consolidateLibrary<T>(sites: T[], modelKey: (site: T) => string) {
  const groups = new Map<string, T[]>();
  for (const site of sites) {
    const key = modelKey(site);
    const uses = groups.get(key);
    if (uses) uses.push(site);
    else groups.set(key, [site]);
  }
  return [...groups.entries()].map(([key, uses]) => ({ key, representative: uses[0], uses }));
}

type AppearanceSite = { id: string; label: string; icon: string; tag: string; variant: string; size: string; className: string; visualCustom: boolean; dynamic: boolean };
/** Conservative identity: unknown inline/custom appearances must never silently merge. */
export function libraryModelKey(site: AppearanceSite, resolved: { group: string; model: string; label?: string; preserveContent?: boolean; bound?: boolean }) {
  return JSON.stringify([
    resolved.group, resolved.model, resolved.preserveContent ? site.label : resolved.label ?? site.label,
    site.icon, site.dynamic, resolved.bound ? "bound" : site.tag,
    !resolved.bound && site.visualCustom ? site.id : "",
    resolved.bound ? "" : site.variant, resolved.bound ? "" : site.size, resolved.bound ? "" : site.className.trim().split(/\s+/).sort().join(" "),
  ]);
}