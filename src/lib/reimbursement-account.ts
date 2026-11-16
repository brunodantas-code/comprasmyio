import { z } from 'zod';
import type { SearchableOption } from '@/components/ui/searchable-select';
export const reimbursementAccountSchema = z.object({
  name: z.string().trim().min(2).max(100), holder: z.string().trim().min(2),
  person_type: z.enum(['PF', 'PJ']), method: z.enum(['pix', 'bank']),
  document: z.string().trim(), pix_key: z.string().trim(), pix_type: z.string(),
  bank: z.string().trim(), agency: z.string().trim(), account: z.string().trim(), account_type: z.string(),
}).superRefine((v, ctx) => {
  const fields = v.method === 'pix' ? ['pix_key'] as const : ['bank', 'agency', 'account'] as const;
  for (const field of fields) if (!v[field]) ctx.addIssue({ code: 'custom', path: [field], message: 'Preencha os dados da conta escolhida.' });
});
export type ReimbursementDetails = z.infer<typeof reimbursementAccountSchema>;
export const emptyReimbursementAccount: ReimbursementDetails = { name: '', holder: '', person_type: 'PF', method: 'pix', document: '', pix_key: '', pix_type: 'cpf', bank: '', agency: '', account: '', account_type: 'corrente' };

const paymentSearchAliases: Record<string, string> = {
  pix: 'PIX chave', bank: 'Dados bancários banco',
  cpf: 'CPF', cnpj: 'CNPJ', email: 'email e-mail', telefone: 'telefone celular', aleatoria: 'chave aleatória',
  PF: 'PF pessoa física', PJ: 'PJ pessoa jurídica', corrente: 'conta corrente', poupanca: 'conta poupança', pagamento: 'conta pagamento',
};

/** Search only the already-authorized accounts, never replace their IDs with typed payment details. */
export function reimbursementAccountOptions(accounts: { id: string; name: string; details: unknown }[]): SearchableOption[] {
  return accounts.map(account => {
    const parsed = reimbursementAccountSchema.safeParse(account.details);
    const fields = parsed.success ? Object.values(parsed.data).flatMap(value => [value, paymentSearchAliases[value] ?? '']) : [];
    return { value: account.id, label: account.name, keywords: fields.join(' ') };
  });
}

const normalizePaymentSearch = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const compactPaymentSearch = (text: string) => normalizePaymentSearch(text).replace(/[^a-z0-9]/g, '');

export function filterReimbursementAccounts(options: SearchableOption[], query: string): SearchableOption[] {
  const needle = compactPaymentSearch(query);
  if (!needle) return options;
  const words = normalizePaymentSearch(query).split(/\s+/).map(compactPaymentSearch).filter(Boolean);
  return options.filter(option => {
    const haystack = compactPaymentSearch(`${option.label} ${option.hint ?? ''} ${option.keywords ?? ''}`);
    return haystack.includes(needle) || words.every(word => haystack.includes(word));
  });
}