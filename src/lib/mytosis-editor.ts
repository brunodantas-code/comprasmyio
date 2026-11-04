/** Flowchart fields are presentation-only; existing ownership is preserved on save. */
export function requiresNodeResponsible(isProcess: boolean) {
  return !isProcess;
}

export function initialNodeShape(isProcess: boolean, parentId: string | null, editingShape: string | null, defaultShape: string) {
  return editingShape ?? (isProcess && !parentId ? "terminal" : defaultShape);
}