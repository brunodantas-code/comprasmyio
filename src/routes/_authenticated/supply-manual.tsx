import { createFileRoute, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { AppHeader } from '@/components/app-header';
import { MyioLogo } from '@/components/myio-logo';
import { SupplyManualReader } from '@/components/supply-manual-reader';

export const Route = createFileRoute('/_authenticated/supply-manual')({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from('user_app_access').select('app_key').eq('user_id', context.user.id).eq('app_key', 'supply').maybeSingle();
    if (!data) throw redirect({ to: '/portal' });
  },
  head: () => ({ meta: [
    { title: 'Manual do Usuário | myio Supply' },
    { name: 'description', content: 'Objetivo, menus e rotinas do Supply: solicitações, aprovações, fabricação, estoque e almoxarifado.' },
    { property: 'og:title', content: 'Manual do Usuário | myio Supply' },
    { property: 'og:description', content: 'Manual atualizado do myio Supply para leitura em tela, com sumário e navegação por assunto.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: SupplyManualPage,
});

function SupplyManualPage() {
  return <div className="min-h-screen bg-background"><AppHeader supplyManual logo={<MyioLogo className="text-xl sm:text-2xl" />} /><SupplyManualReader /></div>;
}