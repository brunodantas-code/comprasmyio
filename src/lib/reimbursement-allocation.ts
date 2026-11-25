import { resolveSupplyAllocation, type AllocationProject } from "./supply-allocation";

export type ReimbursementAllocationTarget = "projeto" | "cliente" | "interna";
export type ReimbursementAllocation = { alloc: ReimbursementAllocationTarget; projectId: string; clientId: string; clientUnitId: string; costCenterId: string; tagId: string };

export function emptyReimbursementAllocation(alloc: ReimbursementAllocationTarget, projectId = ""): ReimbursementAllocation {
  return { alloc, projectId: alloc === "projeto" ? projectId : "", clientId: "", clientUnitId: "", costCenterId: "", tagId: "" };
}

/** Chave da classificação: reembolsos com a mesma chave seguem na mesma solicitação do Supply. */
export function reimbursementAllocationKey(a: ReimbursementAllocation) {
  return [a.alloc, a.alloc === "projeto" ? a.projectId : "", a.alloc === "cliente" ? a.clientId : "", a.alloc === "cliente" ? a.clientUnitId : "", a.costCenterId, a.alloc === "interna" ? a.tagId : ""].join("|");
}

/** Agrupa os índices dos reembolsos por classificação, preservando a ordem original. */
export function groupReimbursementsByAllocation<T extends ReimbursementAllocation>(legs: T[]): number[][] {
  const groups = new Map<string, number[]>();
  legs.forEach((leg, i) => {
    const key = reimbursementAllocationKey(leg);
    const list = groups.get(key);
    if (list) list.push(i); else groups.set(key, [i]);
  });
  return [...groups.values()];
}

/** Resolve somente as classificações individuais; reembolso não possui uma alocação geral obrigatória. */
export function resolveReimbursementOrderAllocations<T extends ReimbursementAllocation>(legs: T[], projects: AllocationProject[]) {
  return groupReimbursementsByAllocation(legs).map((indexes) => {
    const first = legs[indexes[0]!]!;
    return {
      indexes,
      allocation: {
        ...resolveSupplyAllocation(first.alloc, first.projectId, first.clientId, first.clientUnitId, projects),
        for_stock: false as const,
        allocation_type: first.alloc,
      },
    };
  });
}
