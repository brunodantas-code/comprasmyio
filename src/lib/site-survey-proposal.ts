import { z } from "zod";
const electricalOthersSchema = z.object({
  transformadores: z.number().int().nonnegative().nullable(),
  casas_de_maquinas: z.number().int().nonnegative().nullable(),
  geradores: z.number().int().nonnegative().nullable(),
  bombas_hidraulicas: z.number().int().nonnegative().nullable(),
  bombas_de_incendio: z.number().int().nonnegative().nullable(),
  elevadores: z.number().int().nonnegative().nullable(),
}).strict().nullable().optional();
export const proposalScopeSchema = z.object({
  hydraulic_shops: z.number().int().nonnegative().nullable(),
  hydraulic_general: z.number().int().nonnegative().nullable(),
  electrical: z.number().int().nonnegative().nullable(),
  scope_breakdown: z.object({
    hydraulic_entry: z.number().int().nonnegative().nullable(),
    electrical_shops: z.number().int().nonnegative().nullable(),
    electrical_entry: z.number().int().nonnegative().nullable(),
    electrical_others: electricalOthersSchema,
  }).strict().nullable().optional(),
  evidence: z.string(),
}).strict();
type ProposalScope = z.infer<typeof proposalScopeSchema>;
export type ProposalScopeBreakdown = NonNullable<ProposalScope["scope_breakdown"]>;
export function proposalGroupQuantities(scope: { hydraulic_shops: number | null; hydraulic_general: number | null; electrical: number | null; scope_breakdown?: ProposalScopeBreakdown | null }) {
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
const otherEnergyLabels: [keyof NonNullable<ProposalScopeBreakdown["electrical_others"]>, string][] = [
  ["transformadores", "Transformadores"],
  ["casas_de_maquinas", "Casas de Máquinas"],
  ["geradores", "Geradores"],
  ["bombas_hidraulicas", "Bombas Hidráulicas"],
  ["bombas_de_incendio", "Bombas de Incêndio"],
  ["elevadores", "Elevadores"],
];
export function proposalOtherEnergyBreakdown(scope: { scope_breakdown?: ProposalScopeBreakdown | null }): { key: string; label: string; count: number }[] {
  const others = scope.scope_breakdown?.electrical_others;
  if (!others) return [];
  return otherEnergyLabels.filter(([key]) => others[key] !== null && others[key] !== undefined).map(([key, label]) => ({ key, label, count: others[key] as number }));
}
export function proposalOtherEnergyText(scope: { scope_breakdown?: ProposalScopeBreakdown | null }): string {
  return proposalOtherEnergyBreakdown(scope).map((item) => `${item.count}\u00A0${item.label.replaceAll(" ", "\u00A0")}`).join(" · ");
}
export type ProposalComparison = { discipline: "water" | "energy"; label: string; proposal: number | null; approved: number; matches: boolean | null };
export function proposalShopKioskComparison(scope: { hydraulic_shops: number | null; hydraulic_general: number | null; electrical: number | null; scope_breakdown?: ProposalScopeBreakdown | null }, approvedWater: number, approvedEnergy: number): ProposalComparison[] {
  const shops = proposalGroupQuantities(scope).find((group) => group.key === "shops");
  if (!shops || (shops.water === null && shops.energy === null)) return [];
  return [
    { discipline: "water" as const, label: "Água", proposal: shops.water, approved: approvedWater, matches: shops.water === null ? null : shops.water === approvedWater },
    { discipline: "energy" as const, label: "Energia", proposal: shops.energy, approved: approvedEnergy, matches: shops.energy === null ? null : shops.energy === approvedEnergy },
  ];
}
export async function validateProposalPdf(file: Blob) {
  if (!file.size) throw new Error("Selecione um PDF não vazio.");
  const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
  if (signature !== "%PDF-") throw new Error("Selecione um arquivo PDF válido.");
}