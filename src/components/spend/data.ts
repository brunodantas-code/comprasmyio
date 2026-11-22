import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import type { CategorySetting } from "./rules";
type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type SpendCard = Row<"spend_cards">;
export type Receipt = Row<"spend_receipts">;
export type Statement = Row<"spend_statements">;
export type Line = Row<"spend_lines">;
export type Lookup = { id: string; name: string };
export type SpendData = { role: string; user_id: string; cards: SpendCard[]; receipts: Receipt[]; statements: Statement[]; lines: Line[]; notices: Row<"spend_notices">[]; logs: Row<"spend_logs">[]; users: Lookup[]; projects: Lookup[]; accounts: Lookup[]; centers: Lookup[]; settings: Record<string, CategorySetting> };
const lookup = z.object({ id: z.string(), name: z.string() });
const workspaceSchema = z.object({ role: z.string(), user_id: z.string(), cards: z.array(z.object({ id: z.string() }).passthrough()), receipts: z.array(z.object({ id: z.string() }).passthrough()), statements: z.array(z.object({ id: z.string() }).passthrough()), lines: z.array(z.object({ id: z.string() }).passthrough()), notices: z.array(z.object({ id: z.string() }).passthrough()), logs: z.array(z.object({ id: z.string() }).passthrough()), users: z.array(lookup), projects: z.array(lookup), accounts: z.array(lookup), centers: z.array(lookup), settings: z.record(z.unknown()) });
export const spendOptions = queryOptions({ queryKey: ["spend"], queryFn: async (): Promise<SpendData> => {
  const r = await supabase.rpc("spend_workspace"); if (r.error) throw r.error;
  workspaceSchema.parse(r.data);
  return r.data as unknown as SpendData;
} });
export async function spendAction(action: string, data: Json) {
  const r = await supabase.rpc("spend_action", { _action: action, _data: data });
  if (r.error) throw new Error(r.error.message); return r.data;
}
export async function uploadSpend(file: File, card: SpendCard, period: string) {
  if (file.size > 20 * 1024 * 1024) throw new Error("O arquivo deve ter até 20 MB");
  if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Use PDF, JPG, PNG ou WebP");
  const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
  const path = `${card.company_key}/${period}/${card.id}/${crypto.randomUUID()}.${ext}`;
  const r = await supabase.storage.from("spend-files").upload(path, file, { contentType: file.type, upsert: false });
  if (r.error) throw r.error; return path;
}
export async function spendFileUrl(path: string) {
  const r = await supabase.storage.from("spend-files").createSignedUrl(path, 600); if (r.error) throw r.error; return r.data.signedUrl;
}