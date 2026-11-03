export type ConnectorPoint = { x: number; y: number };
export type ConnectorBox = { id: string; left: number; right: number; top: number; bottom: number };
export type ConnectorSide = "left" | "right" | "top" | "bottom";
export const portDirection = (side: ConnectorSide): ConnectorPoint => ({ x: side === "left" ? -1 : side === "right" ? 1 : 0, y: side === "top" ? -1 : side === "bottom" ? 1 : 0 });

export function connectorRelations<N extends { id: string; parent_id: string | null }, L extends { predecessor_id: string; successor_id: string }>(nodes: N[], links: L[], process: boolean) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return [
    ...(!process ? nodes.filter((node) => node.parent_id && !links.some((link) => link.successor_id === node.id && byId.get(link.predecessor_id)?.parent_id === node.parent_id)).map((node) => ({ from: node.parent_id ?? "", to: node.id, link: undefined as L | undefined })) : []),
    ...links.map((link) => ({ from: link.predecessor_id, to: link.successor_id, link })),
  ];
}

export function segmentCrossesBox(a: ConnectorPoint, b: ConnectorPoint, box: ConnectorBox): boolean {
  if (a.x === b.x) return a.x > box.left && a.x < box.right && Math.max(a.y, b.y) > box.top && Math.min(a.y, b.y) < box.bottom;
  if (a.y === b.y) return a.y > box.top && a.y < box.bottom && Math.max(a.x, b.x) > box.left && Math.min(a.x, b.x) < box.right;
  // Clip a diagonal segment against the open rectangle interior.
  let low = 0, high = 1;
  for (const [start, delta, min, max] of [[a.x, b.x - a.x, box.left, box.right], [a.y, b.y - a.y, box.top, box.bottom]]) {
    if (delta === 0) { if (start <= min || start >= max) return false; continue; }
    const first = (min - start) / delta, last = (max - start) / delta;
    low = Math.max(low, Math.min(first, last));
    high = Math.min(high, Math.max(first, last));
    if (low >= high) return false;
  }
  return low < high && high > 0 && low < 1;
}

/** Orthogonal visibility grid: every segment is checked against all visible boxes. */
export function routeConnector(from: ConnectorBox, to: ConnectorBox, boxes: ConnectorBox[]): { points: ConnectorPoint[]; fromSide: ConnectorSide; toSide: ConnectorSide } | null {
  const dx = (to.left + to.right - from.left - from.right) / 2;
  const dy = (to.top + to.bottom - from.top - from.bottom) / 2;
  const horizontal = to.left >= from.right || to.right <= from.left;
  const fromSide: ConnectorSide = horizontal ? dx >= 0 ? "right" : "left" : dy >= 0 ? "bottom" : "top";
  const toSide: ConnectorSide = fromSide === "right" ? "left" : fromSide === "left" ? "right" : fromSide === "bottom" ? "top" : "bottom";
  const port = (box: ConnectorBox, side: ConnectorSide): ConnectorPoint => ({ x: side === "left" ? box.left : side === "right" ? box.right : (box.left + box.right) / 2, y: side === "top" ? box.top : side === "bottom" ? box.bottom : (box.top + box.bottom) / 2 });
  const a = port(from, fromSide), b = port(to, toSide);
  // Adjacent boxes connect directly at their side centres, even with different heights.
  if (horizontal && Math.abs(a.y - b.y) <= 12 && !boxes.some((box) => segmentCrossesBox(a, b, box))) return { points: [a, b], fromSide, toSide };
  const da = portDirection(fromSide), db = portDirection(toSide);
  const start = { x: a.x + da.x * 10, y: a.y + da.y * 10 };
  const end = { x: b.x + db.x * 10, y: b.y + db.y * 10 };
  const obstacles = boxes.map((box) => ({ ...box, left: box.left - 6, right: box.right + 6, top: box.top - 6, bottom: box.bottom + 6 }));
  if (boxes.some((box) => box.id !== from.id && segmentCrossesBox(a, start, box)) || boxes.some((box) => box.id !== to.id && segmentCrossesBox(end, b, box))) return null;
  const xs = [...new Set([start.x, end.x, ...obstacles.flatMap((box) => [box.left, box.right])])].sort((a, b) => a - b);
  const ys = [...new Set([start.y, end.y, ...obstacles.flatMap((box) => [box.top, box.bottom])])].sort((a, b) => a - b);
  const width = xs.length;
  const index = (point: ConnectorPoint) => ys.indexOf(point.y) * width + xs.indexOf(point.x);
  const at = (i: number): ConnectorPoint => ({ x: xs[i % width], y: ys[Math.floor(i / width)] });
  const source = index(start), target = index(end);
  const distances = new Map<number, number>([[source, 0]]), previous = new Map<number, number>();
  const queue = [{ index: source, distance: 0 }];
  while (queue.length) {
    queue.sort((a, b) => b.distance - a.distance);
    const current = queue.pop();
    if (!current) break;
    if (current.distance !== distances.get(current.index)) continue;
    if (current.index === target) {
      const points = [end];
      let i = target;
      while (i !== source) {
        const parent = previous.get(i);
        if (parent === undefined) return null;
        i = parent;
        points.unshift(at(i));
      }
      const compact: ConnectorPoint[] = [];
      for (const point of [a, ...points, b]) {
        const last = compact[compact.length - 1], prior = compact[compact.length - 2];
        if (last && last.x === point.x && last.y === point.y) continue;
        if (prior && last && ((prior.x === last.x && last.x === point.x) || (prior.y === last.y && last.y === point.y))) compact.pop();
        compact.push(point);
      }
      return { points: compact, fromSide, toSide };
    }
    const x = current.index % width, y = Math.floor(current.index / width);
    const neighbors = [x > 0 ? current.index - 1 : -1, x + 1 < width ? current.index + 1 : -1, y > 0 ? current.index - width : -1, y + 1 < ys.length ? current.index + width : -1];
    for (const next of neighbors) {
      if (next < 0) continue;
      const p = at(current.index), q = at(next);
      if (obstacles.some((box) => segmentCrossesBox(p, q, box))) continue;
      const parent = previous.get(current.index);
      const prior = parent === undefined ? a : at(parent);
      const turned = (prior.x === p.x) !== (p.x === q.x);
      const distance = current.distance + Math.abs(p.x - q.x) + Math.abs(p.y - q.y) + (turned ? 20 : 0);
      if (distance >= (distances.get(next) ?? Infinity)) continue;
      distances.set(next, distance); previous.set(next, current.index); queue.push({ index: next, distance });
    }
  }
  return null;
}