import { rootObjectiveOf, type MytosisNode } from "./mytosis";

/** References remain separate from dependencies; each reachable flow is drawn once. */
export function linkedFlowReferences(nodes: MytosisNode[]) {
  return nodes.flatMap((node) => {
    if (!node.is_process || !node.linked_node_id) return [];
    const target = rootObjectiveOf(node.linked_node_id, nodes);
    const source = rootObjectiveOf(node.id, nodes);
    return target?.is_process && source && target.id !== source.id
      ? [{ nodeId: node.id, sourceId: source.id, targetId: target.id, targetNodeId: node.linked_node_id }]
      : [];
  });
}

export function visibleLinkedFlows(rootId: string, references: ReturnType<typeof linkedFlowReferences>, expanded: Set<string>) {
  const ids = [rootId];
  const seen = new Set(ids);
  for (let i = 0; i < ids.length; i++) {
    for (const ref of references) {
      if (ref.sourceId !== ids[i] || !expanded.has(ref.nodeId) || seen.has(ref.targetId)) continue;
      seen.add(ref.targetId);
      ids.push(ref.targetId);
    }
  }
  return ids;
}