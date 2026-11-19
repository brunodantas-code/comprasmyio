import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { FileSignature } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { AppHeader } from '@/components/app-header';
import { MyioLogo } from '@/components/myio-logo';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { InventorySignatureDialog } from '@/components/inventory-signature-dialog';
import { signatureDate } from '@/lib/signatures';
export const Route = createFileRoute('/_authenticated/inventory-signatures')({
  validateSearch: (search: Record<string, unknown>) => ({ inventory: typeof search.inventory === 'string' ? search.inventory : undefined }),
  head: () => ({ meta: [{ title: 'Assinaturas de Inventário | myio Supply' }, { name: 'description', content: 'Confira e assine suas contagens de estoque no myio Supply.' }, { property: 'og:title', content: 'Assinaturas de Inventário | myio Supply' }, { property: 'og:description', content: 'Contagens de estoque e assinaturas dos inventariantes.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: InventorySignaturesPage,
});
function InventorySignaturesPage() {
  const { inventory } = Route.useSearch();
  const { data: me } = useCurrentUser();
  const [signing, setSigning] = useState(false);
  const query = useQuery({ queryKey: ['inventory-signatures', inventory, me?.id], enabled: !!inventory && !!me, queryFn: async () => {
    const { data, error } = await supabase.from('stock_inventory_signatures').select('*,stock_inventories(*)').eq('inventory_id', inventory ?? '').eq('user_id', me?.id ?? '').single();
    if (error) throw error; return data;
  } });
  const row = query.data?.stock_inventories;
  const items = Array.isArray(row?.items) ? row.items as unknown as { material_id: string; name: string; counted: number; balance: number }[] : [];
  return <div className="min-h-screen bg-background"><AppHeader logo={<MyioLogo label={null} />} /><main className="mx-auto max-w-7xl space-y-4 px-4 py-6"><h1 className="text-xl">{row?.name ?? 'Assinatura de inventário'}</h1>{query.isPending ? <p>Carregando…</p> : query.error ? <p role="alert" className="text-destructive">Inventário indisponível.</p> : row && <><p>{row.inventory_date.split('-').reverse().join('/')} · {row.counters.join(', ')}</p><Table><TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Contagem</TableHead></TableRow></TableHeader><TableBody>{items.map(item => <TableRow key={item.material_id}><TableCell>{item.name}</TableCell><TableCell>{item.counted}</TableCell></TableRow>)}</TableBody></Table>{query.data?.signed_at ? <p>Assinado em {signatureDate(query.data.signed_at)}</p> : <div className="flex items-center justify-end gap-3"><span className="text-destructive">Aguardando assinatura</span><Button aria-label="Assinar inventário" onClick={() => setSigning(true)}><FileSignature />Assinar</Button></div>}</>}{me && <InventorySignatureDialog inventory={signing && row ? row : null} userId={me.id} close={() => setSigning(false)} />}</main></div>;
}