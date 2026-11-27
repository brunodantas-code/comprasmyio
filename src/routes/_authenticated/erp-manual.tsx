import { createFileRoute } from '@tanstack/react-router';
import { AppHeader } from '@/components/app-header';
import { MyioPlatformLogo } from '@/components/myio-platform-logo';
import { useAppTile, APP_TILE_DEFAULT, appLogoPx, homeHeaderLogoTone } from '@/components/cde/app-order-config';
import { ErpManualReader } from '@/components/erp-manual-reader';

export const Route = createFileRoute('/_authenticated/erp-manual')({
  head: () => ({ meta: [
    { title: 'Manual do Usuário | ERP myio' },
    { name: 'description', content: 'Home Page, Menu Principal e instalação do ERP myio no iPhone e Android com contador de pendências.' },
    { property: 'og:title', content: 'Manual do Usuário | ERP myio' },
    { property: 'og:description', content: 'Consulte a navegação do ERP myio, aplicativos, tarefas pessoais e ativação do contador no celular.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: ErpManualPage,
});

function ErpManualPage() {
  const tile = useAppTile().data ?? APP_TILE_DEFAULT;
  return <div className="min-h-screen bg-background"><AppHeader logo={<MyioPlatformLogo tone={homeHeaderLogoTone(tile)} logoPx={appLogoPx(tile)} />} /><ErpManualReader /></div>;
}