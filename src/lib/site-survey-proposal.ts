import { z } from "zod";
export const proposalScopeSchema = z.object({
  hydraulic_shops: z.number().int().nonnegative().nullable(),
  hydraulic_general: z.number().int().nonnegative().nullable(),
  electrical: z.number().int().nonnegative().nullable(),
  scope_breakdown: z.object({
    hydraulic_entry: z.number().int().nonnegative().nullable(),
    electrical_shops: z.number().int().nonnegative().nullable(),
    electrical_entry: z.number().int().nonnegative().nullable(),
  }).strict().nullable().optional(),
  evidence: z.string(),
}).strict();
export function proposalGroupQuantities(scope: { hydraulic_shops: number | null; hydraulic_general: number | null; electrical: number | null; scope_breakdown?: { hydraulic_entry: number | null; electrical_shops: number | null; electrical_entry: number | null } | null }) {
  const breakdown = scope.scope_breakdown;
  const remainder = (total: number | null, ...parts: (number | null | undefined)[]) => {
    if (total === null || parts.some((value) => value == null)) return null;
    const value = total - parts.reduce<number>((sum, part) => sum + (part ?? 0), 0);
    return value >= 0 ? value : null;
  };
  return [
    { key: "shops", label: "Lojas e Quiosques", water: scope.hydraulic_shops, energy: breakdown?.electrical_shops ?? null },
    { key: "entry", label: "Entrada da Concessionária", water: breakdown?.hydraulic_entry ?? null, energy: breakdown?.electrical_entry ?? null },
    { key: "others", label: "Demais ambientes", water: remainder(scope.hydraulic_general, breakdown?.hydraulic_entry), energy: remainder(scope.electrical, breakdown?.electrical_shops, breakdown?.electrical_entry) },
  ];
}
export async function validateProposalPdf(file: Blob) {
  if (!file.size) throw new Error("Selecione um PDF não vazio.");
  const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
  if (signature !== "%PDF-") throw new Error("Selecione um arquivo PDF válido.");
}