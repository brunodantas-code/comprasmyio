export function classificationAccess(busy: boolean, approved: boolean, hasReceipt: boolean, account: string, center: string, receiptNotApplicable = false) {
  return { canSave: !busy && !approved, canApprove: !busy && !approved && (hasReceipt || receiptNotApplicable) && !!account && !!center };
}
export function lineActionVisibility(hasReceipt: boolean, receiptNotApplicable: boolean) {
  const waived = !hasReceipt && receiptNotApplicable;
  return { attach: !hasReceipt && !waived, notify: !hasReceipt && !waived, requestAdjustment: !waived };
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
export function bulkClassificationPatch(account: string, center: string, project: string) {
  return {
    ...(account ? { account_id: account } : {}),
    ...(center ? { cost_center_id: center } : {}),
    ...(project ? { project_id: project } : {}),
  };
}
export function bulkClassificationTargets<T extends { id: string; status: string; statement_id: string }>(lines: readonly T[], selected: ReadonlySet<string>) {
  const targets = lines.filter(line => selected.has(line.id) && line.status !== 'approved');
  if (!targets.length) throw new Error('Selecione ao menos um lançamento não aprovado.');
  if (new Set(targets.map(line => line.statement_id)).size > 1) throw new Error('Selecione lançamentos da mesma fatura.');
  return targets;
}