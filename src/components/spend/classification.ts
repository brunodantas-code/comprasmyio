export function classificationAccess(busy: boolean, approved: boolean, hasReceipt: boolean, account: string, center: string, receiptNotApplicable = false) {
  return { canSave: !busy && !approved, canApprove: !busy && !approved && (hasReceipt || receiptNotApplicable) && !!account && !!center };
}
export function showReceiptCnpj(receiptId: string | null) {
  return !!receiptId;
}
export function classificationTargets<T extends { id: string; status: string }>(lines: readonly T[], selected: ReadonlySet<string>, sourceId: string) {
  const targets = lines.filter(l => selected.has(l.id) && l.status !== "approved").map(l => l.id);
  return targets.length ? [...new Set([...targets, sourceId])] : [sourceId];
}
export function toggleFilteredSelection<T extends { id: string; status: string }>(lines: readonly T[], selected: ReadonlySet<string>, checked: boolean) {
  const next = new Set(selected);
  for (const line of lines) if (line.status !== "approved") { if (checked) next.add(line.id); else next.delete(line.id); }
  return next;
}