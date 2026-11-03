export type BoxTask = {
  id: string; node_id: string; title: string; description: string;
  responsible_id: string; created_by: string; involved_ids: string[];
  due_date: string | null; completed: boolean; created_at: string; updated_at: string;
};

export function canCompleteBoxTask(task: Pick<BoxTask, "created_by" | "responsible_id">, userId: string, hasAccess: boolean) {
  return hasAccess && !!userId && (task.created_by === userId || task.responsible_id === userId);
}

export function predecessorTaskSignal(nodeId: string, tasks: Pick<BoxTask, "node_id" | "completed">[], links: { predecessor_id: string; successor_id: string }[]) {
  const predecessors = new Set(links.filter((l) => l.successor_id === nodeId).map((l) => l.predecessor_id));
  return { pending: tasks.filter((t) => predecessors.has(t.node_id) && !t.completed).length, blocksAdvance: false as const };
}