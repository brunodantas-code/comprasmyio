/** All explicit predecessors, without the selected box, even for legacy cycles. */
export function previousBoxIds(nodeId: string, links: readonly { predecessor_id: string; successor_id: string }[]): Set<string> {
  const visited = new Set<string>([nodeId]);
  const previous = new Set<string>();
  const queue = [nodeId];
  while (queue.length) {
    const current = queue.pop();
    for (const link of links) {
      if (link.successor_id !== current || visited.has(link.predecessor_id)) continue;
      visited.add(link.predecessor_id);
      previous.add(link.predecessor_id);
      queue.push(link.predecessor_id);
    }
  }
  return previous;
}