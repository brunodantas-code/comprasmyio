export type InventorySigner = { inventory_id: string; user_id: string; signed_at: string | null };
export function pendingInventorySignatures(signatures: readonly InventorySigner[], userId: string) {
  return signatures.filter(signer => signer.user_id === userId && !signer.signed_at);
}