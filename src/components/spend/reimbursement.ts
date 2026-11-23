import { supabase } from '@/integrations/supabase/client';
import type { Receipt } from './data';

export function availableReimbursements<T extends { payment_source: string; holder_id: string; status: string; reimbursement_order_id: string | null }>(receipts: T[], userId: string) {
  return receipts.filter(r => r.payment_source === 'reimbursement' && r.holder_id === userId && r.status !== 'approved' && !r.reimbursement_order_id);
}
export function reimbursementTotal(receipts: { amount: number }[]) {
  return receipts.reduce((sum, r) => sum + Math.round(r.amount * 100), 0) / 100;
}
export type ReimbursementDraft = { receipts: Receipt[]; files: File[] };
export async function loadReimbursementDraft(ids: string[]): Promise<ReimbursementDraft> {
  const response = await supabase.rpc('spend_reimbursement_receipts', { _ids: ids });
  if (response.error) throw new Error(response.error.message);
  const receipts = response.data;
  if (receipts.length !== ids.length) throw new Error('Não foi possível carregar todos os comprovantes.');
  const files: File[] = [];
  for (const r of receipts) {
    const download = await supabase.storage.from('spend-files').download(r.file_path);
    if (download.error) throw new Error(`Não foi possível carregar a foto de ${r.merchant}.`);
    const extension = r.file_path.split('.').pop() ?? 'jpg';
    files.push(new File([download.data], `${r.merchant.replace(/[^\p{L}\p{N} .-]/gu, '_')}-${r.date}.${extension}`, { type: download.data.type }));
  }
  return { receipts, files };
}
export async function stageReimbursementAttachments(draft: ReimbursementDraft, userId: string) {
  const attachments: { path: string; name: string; size: number; type: string }[] = [];
  try {
    for (let i = 0; i < draft.receipts.length; i++) {
      const receipt = draft.receipts[i]; const file = draft.files[i];
      if (!receipt || !file) throw new Error('Todos os comprovantes devem estar anexados.');
      const path = `${userId}/spend/${receipt.id}/${crypto.randomUUID()}.${receipt.file_path.split('.').pop() ?? 'jpg'}`;
      const result = await supabase.storage.from('order-attachments').upload(path, file, { contentType: file.type || 'application/octet-stream' });
      if (result.error) throw new Error(result.error.message);
      attachments.push({ path, name: file.name, size: file.size, type: file.type });
    }
    return attachments;
  } catch (error) {
    if (attachments.length) await supabase.storage.from('order-attachments').remove(attachments.map(a => a.path));
    throw error;
  }
}