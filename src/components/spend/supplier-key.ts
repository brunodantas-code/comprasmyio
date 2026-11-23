export function supplierKey(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}