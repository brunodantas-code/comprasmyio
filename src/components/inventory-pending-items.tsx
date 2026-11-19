import { Link } from '@tanstack/react-router';
import { FileSignature } from 'lucide-react';
import { PendingRowContent, type PendingGroupItem } from '@/components/pending-groups';
export function inventoryPendingItems(items: readonly { inventory_id: string; stock_inventories: { name: string } | null }[]): PendingGroupItem[] {
  return items.map(item => ({ key: `inventory-${item.inventory_id}`, app: 'Supply', requester: 'Você', count: 1, row: <Link to="/inventory-signatures" search={{ inventory: item.inventory_id }} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/10"><PendingRowContent icon={FileSignature} destructive label={`${item.stock_inventories?.name ?? 'Inventário'} · Aguardando sua assinatura`} /></Link> }));
}