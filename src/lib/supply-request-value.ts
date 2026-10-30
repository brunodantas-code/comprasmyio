import { z } from "zod";

export const supplyRequiredValueSchema = z.coerce.number().finite().positive("Informe um valor maior que zero.").max(1000000000);

export function requiresSupplyRequestValue(model: string): boolean {
  return ["servicos", "materiais", "viagens"].includes(model);
}

export function invalidSupplyRequestValueIndex(model: string, values: unknown[]): number {
  if (!requiresSupplyRequestValue(model)) return -1;
  if (!values.length) return 0;
  return values.findIndex((value) => !supplyRequiredValueSchema.safeParse(value).success);
}