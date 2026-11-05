export const normalizeSearch = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Only Internal allocations carry a tag; any other destination drops it. */
export function resolveSupplyTag(allocationType: string | null | undefined, tagId: string | null | undefined) {
  return allocationType === "interna" && tagId ? tagId : null;
}

export type TagCostOrder = { tag_id: string | null; status: string; estimated_value: number | null; final_value?: number | null };

/** Consolidated cost per tag; cancelled requests are excluded. */
export function consolidateTagCosts(orders: TagCostOrder[]) {
  const totals = new Map<string, { count: number; total: number }>();
  for (const o of orders) {
    if (!o.tag_id || o.status === "cancelado") continue;
    const entry = totals.get(o.tag_id) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += Number(o.final_value ?? o.estimated_value ?? 0);
    totals.set(o.tag_id, entry);
  }
  return totals;
}
