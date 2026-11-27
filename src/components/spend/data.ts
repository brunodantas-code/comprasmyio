import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import type { CategorySetting } from "./rules";
type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type SpendCard = Row<"spend_cards">;
export type Receipt = Row<"spend_receipts"> & { reimbursement_paid?: boolean; reimbursement_payment_date?: string | null };
export type Statement = Row<"spend_statements">;
export type Line = Row<"spend_lines">;
export type Lookup = { id: string; name: string };
export type SupplierAllocation = Row<"spend_supplier_allocations">;
export type SpendData = { role: string; user_id: string; cards: SpendCard[]; receipts: Receipt[]; statements: Statement[]; lines: Line[]; notices: Row<"spend_notices">[]; logs: Row<"spend_logs">[]; users: Lookup[]; projects: Lookup[]; accounts: Lookup[]; centers: Lookup[]; settings: Record<string, CategorySetting>; allocations: SupplierAllocation[]; delegations: Delegation[]; advances: SpendAdvance[] };
export type SpendAdvance = Row<"spend_advances">;
export type Delegation = Row<"spend_card_delegations">;
const lookup = z.object({ id: z.string(), name: z.string() });
const workspaceSchema = z.object({ role: z.string(), user_id: z.string(), cards: z.array(z.object({ id: z.string() }).passthrough()), receipts: z.array(z.object({ id: z.string() }).passthrough()), statements: z.array(z.object({ id: z.string() }).passthrough()), lines: z.array(z.object({ id: z.string() }).passthrough()), notices: z.array(z.object({ id: z.string() }).passthrough()), logs: z.array(z.object({ id: z.string() }).passthrough()), users: z.array(lookup), projects: z.array(lookup), accounts: z.array(lookup), centers: z.array(lookup), settings: z.record(z.unknown()), delegations: z.array(z.object({ id: z.string() }).passthrough()).default([]), advances: z.array(z.object({ id: z.string() }).passthrough()).default([]) });
export const spendOptions = queryOptions({ queryKey: ["spend"], queryFn: async (): Promise<SpendData> => {
  const r = await supabase.rpc("spend_workspace"); if (r.error) throw r.error;
  const parsed = workspaceSchema.parse(r.data);
  const [allocations, payments] = await Promise.all([
    parsed.role === 'finance' ? supabase.from('spend_supplier_allocations').select('*').order('supplier') : Promise.resolve({ data: [], error: null }),
    supabase.rpc('spend_reimbursement_payments'),
  ]);
  if (allocations.error) throw allocations.error;
  if (payments.error) throw payments.error;
  const paymentByReceipt = new Map(payments.data.map(payment => [payment.receipt_id, payment]));
  const base = r.data as unknown as SpendData;
  return { ...base, receipts: base.receipts.map(receipt => {
    const payment = paymentByReceipt.get(receipt.id);
    return payment ? { ...receipt, reimbursement_paid: payment.paid, reimbursement_payment_date: payment.payment_date } : receipt;
  }), delegations: parsed.delegations as unknown as Delegation[], advances: parsed.advances as unknown as SpendAdvance[], allocations: allocations.data ?? [] };
} });
export async function spendAction(action: string, data: Json) {
  const r = await supabase.rpc("spend_action", { _action: action, _data: data });
  if (r.error) throw new Error(r.error.message); return r.data;
}
export async function saveSpendClassification(data: Json) {
  const r = await supabase.rpc("spend_save_classification", { _data: data });
  if (r.error) throw new Error(r.error.message);
  return r.data;
}
export async function deleteSpendReceipt(receiptId: string) {
  const result = await supabase.rpc("spend_delete_receipt", { _receipt_id: receiptId });
  if (result.error) throw new Error(result.error.message);
  if (!result.data || typeof result.data !== 'object' || Array.isArray(result.data) || result.data['ok'] !== true) throw new Error("Não foi possível confirmar a exclusão");
}
function validateSpendFile(file: File) {
  if (file.size > 20 * 1024 * 1024) throw new Error("O arquivo deve ter até 20 MB");
  if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Use PDF, JPG, PNG ou WebP");
  return file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
}
async function uploadSpendFile(file: File, path: string) {
  const r = await supabase.storage.from("spend-files").upload(path, file, { contentType: file.type, upsert: false });
  if (r.error) throw r.error; return path;
}
export async function uploadSpend(file: File, card: SpendCard, period: string) {
  const ext = validateSpendFile(file);
  return uploadSpendFile(file, `${card.company_key}/${period}/${card.id}/${crypto.randomUUID()}.${ext}`);
}
export async function uploadSpendAdvance(file: File, advanceId: string, period: string) {
  const ext = validateSpendFile(file);
  return uploadSpendFile(file, `advances/${advanceId}/${period}/${crypto.randomUUID()}.${ext}`);
}
export async function uploadSpendReimbursement(file: File, userId: string, period: string) {
  const ext = validateSpendFile(file);
  return uploadSpendFile(file, `reimbursement/${userId}/${period}/${crypto.randomUUID()}.${ext}`);
}
export async function spendFileUrl(path: string) {
  const r = await supabase.storage.from("spend-files").createSignedUrl(path, 600); if (r.error) throw r.error; return r.data.signedUrl;
}export async function spendDelegation(action: "grant" | "revoke", data: Json) {
  const r = await supabase.rpc("spend_delegation", { _action: action, _data: data });
  if (r.error) throw new Error(r.error.message); return r.data;
}

export async function spendAdvance(action: "create" | "approve_receipt" | "reopen_receipt" | "close", data: Json) {
  const r = await supabase.rpc("spend_advance", { _action: action, _data: data });
  if (r.error) throw new Error(r.error.message); return r.data;
}
