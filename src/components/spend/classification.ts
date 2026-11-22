export function classificationAccess(busy: boolean, approved: boolean, hasReceipt: boolean, account: string, center: string) {
  return { canSave: !busy && !approved, canApprove: !busy && !approved && hasReceipt && !!account && !!center };
}