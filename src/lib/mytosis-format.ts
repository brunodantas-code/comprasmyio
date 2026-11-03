import type { MytosisNode } from "./mytosis";

export function initialStageFormat(nodes: MytosisNode[], editing: MytosisNode | null, sourceId?: string | null) {
  return editing ?? nodes.find((node) => node.id === sourceId);
}