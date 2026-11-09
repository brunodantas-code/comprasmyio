import { z } from 'zod';
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