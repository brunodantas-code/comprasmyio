/** Flowchart fields are presentation-only; existing ownership is preserved on save. */
export function requiresNodeResponsible(isProcess: boolean) {
  return !isProcess;
}

export function initialNodeShape(isProcess: boolean, parentId: string | null, editingShape: string | null, defaultShape: string) {
  return editingShape ?? (isProcess && !parentId ? "terminal" : defaultShape);
}

export function processEntryNodes<T extends { id: string; parent_id: string | null }>(rootId: string, nodes: T[], links: { predecessor_id: string; successor_id: string }[]) {
  const siblings = nodes.filter((node) => node.parent_id === rootId);
  const ids = new Set(siblings.map((node) => node.id));
  return siblings.filter((node) => !links.some((link) => link.successor_id === node.id && ids.has(link.predecessor_id)));
}