import { z } from "zod";

export const allocationTypeSchema = z.enum(["projeto", "cliente", "estoque", "interna"]);
export type SupplyAllocationType = z.infer<typeof allocationTypeSchema>;
export type AllocationProject = { id: string; client_id: string | null; client_unit_id?: string | null };

export function resolveSupplyAllocation(type: SupplyAllocationType, projectId: string, clientId: string, unitId: string, projects: AllocationProject[]) {
  allocationTypeSchema.parse(type);
  if (type === "projeto") {
    const project = projects.find((entry) => entry.id === projectId);
    if (!project) throw new Error("Selecione um projeto válido.");
    if (!project.client_id) throw new Error("Vincule um Cliente ao Projeto no Cadastro antes de solicitar a compra.");
    return { project_id: project.id, client_id: project.client_id, client_unit_id: project.client_unit_id ?? null };
  }
  if (type === "cliente") {
    if (!clientId || clientId === "none") throw new Error("Selecione um cliente para Sustentação.");
    return { project_id: null, client_id: clientId, client_unit_id: unitId || null };
  }
  return { project_id: null, client_id: null, client_unit_id: null };
}