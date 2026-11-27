import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { spendAccountDisplay } from './account-display';
import type { SpendData } from './data';

export function SpendClassificationFields({ data, account, center, project, setAccount, setCenter, setProject, disabled, bulk = false }: {
  data: SpendData; account: string; center: string; project: string;
  setAccount: (value: string) => void; setCenter: (value: string) => void; setProject: (value: string) => void;
  disabled: boolean; bulk?: boolean;
}) {
  const accounts = data.accounts.map(spendAccountDisplay);
  const context = bulk ? 'em lote' : 'do lançamento';
  return <section className="spend-classification-fields" aria-label={bulk ? 'Campos da classificação em lote' : 'Campos da classificação'}>
    <div className="spend-classification-primary">
      <div className="min-w-0 space-y-1"><Label>Código</Label><SearchableSelect aria-label={`Código da conta ${context}`} disabled={disabled} clearable={false} value={account} onChange={setAccount} options={accounts.map(item => ({ value: item.id, label: item.code || 'Sem código', hint: item.name }))} placeholder={bulk ? 'Manter código' : 'Código da conta'} /></div>
      <div className="min-w-0 space-y-1"><Label>Nome da conta</Label><SearchableSelect aria-label={`Nome da conta ${context}`} disabled={disabled} value={account} onChange={setAccount} options={accounts.map(item => ({ value: item.id, label: item.name, keywords: item.code }))} placeholder={bulk ? 'Manter conta atual' : 'Selecionar conta'} /></div>
      <div className="min-w-0 space-y-1"><Label>Centro de Custo</Label><SearchableSelect aria-label={`Centro de Custo ${context}`} disabled={disabled} value={center} onChange={setCenter} options={data.centers.map(item => ({ value: item.id, label: item.name }))} placeholder={bulk ? 'Manter Centro de Custo atual' : 'Selecionar Centro de Custo'} /></div>
      <div className="spend-classification-project min-w-0 space-y-1"><Label>Projeto</Label><SearchableSelect aria-label={`Projeto ${context}`} disabled={disabled} value={project} onChange={setProject} options={data.projects.map(item => ({ value: item.id, label: item.name }))} placeholder={bulk ? 'Manter Projeto atual' : 'Projeto (opcional)'} /></div>
    </div>
  </section>;
}