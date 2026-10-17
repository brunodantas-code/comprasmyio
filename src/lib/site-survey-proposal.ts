import { z } from "zod";
export const proposalScopeSchema = z.object({
  hydraulic_shops: z.number().int().nonnegative().nullable(),
  hydraulic_general: z.number().int().nonnegative().nullable(),
  electrical: z.number().int().nonnegative().nullable(),
  evidence: z.string(),
}).strict();
export async function validateProposalPdf(file: Blob) {
  if (!file.size) throw new Error("Selecione um PDF não vazio.");
  const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
  if (signature !== "%PDF-") throw new Error("Selecione um arquivo PDF válido.");
}