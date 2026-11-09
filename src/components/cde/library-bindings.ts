export type LibraryBinding = { group: string; label: string; modelKey?: string; preserveContent?: boolean };
export function readButtonBindings(raw?: string): Record<string, LibraryBinding> {
  try {
    const value: unknown = JSON.parse(raw ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([, b]) => b && typeof b === "object" && typeof b.group === "string" && typeof b.label === "string" && (b.modelKey === undefined || typeof b.modelKey === "string")));
  } catch { return {}; }
}
export function resolveButtonBinding(bindings: Record<string, LibraryBinding>, id?: string, label = "") {
  return (id ? bindings[id] : undefined) ?? bindings[label.trim()];
}