export type MytosisNode = {
  id: string;
  locator: number;
  kind: "objective" | "task";
  title: string;
  description: string | null;
  parent_id: string | null;
  responsible_id: string | null;
  due_date: string | null;
  weight: number;
  progress: number;
  position: number;
  created_at: string;
  is_process?: boolean;
  shape?: string;
  fill_color?: string;
  border_color?: string;
  title_font_size?: number;
  title_color?: string | null;
  control_color?: string | null;
  custom_format?: boolean;
  linked_node_id?: string | null;
  description_font_size?: number;
  text_align?: "left" | "center" | "right";
  text_vertical_align?: "top" | "center" | "bottom";
};

export type MytosisLink = { predecessor_id: string; successor_id: string; style?: string; color?: string | null };

/** Hierarchy defines levels; dependencies order siblings without adding levels. */
export function computeBoxNumbers(nodes: MytosisNode[], links: MytosisLink[]) {
  const numbers = new Map<string, string>();
  const children = childrenMap(nodes);
  const assign = (node: MytosisNode, number: string, seen: Set<string>) => {
    if (seen.has(node.id)) return;
    numbers.set(node.id, number);
    const next = new Set(seen).add(node.id);
    const remaining = [...(children.get(node.id) ?? [])];
    const ordered: MytosisNode[] = [];
    while (remaining.length) {
      const index = remaining.findIndex((candidate) => !links.some((link) => link.successor_id === candidate.id && remaining.some((other) => other.id === link.predecessor_id)));
      const [child] = remaining.splice(index < 0 ? 0 : index, 1);
      if (child) ordered.push(child);
    }
    ordered.forEach((child, index) => assign(child, `${number}.${index + 1}`, next));
  };
  const roots = nodes.filter((node) => !node.parent_id).sort((a, b) => (a.position || 1e9) - (b.position || 1e9) || a.locator - b.locator);
  for (const process of [false, true]) {
    roots.filter((node) => !!node.is_process === process).forEach((root, index) => assign(root, String(index + 1), new Set()));
  }
  return numbers;
}

export function childrenMap(nodes: MytosisNode[]) {
  const map = new Map<string, MytosisNode[]>();
  for (const node of nodes) {
    if (!node.parent_id) continue;
    const list = map.get(node.parent_id) ?? [];
    list.push(node);
    map.set(node.parent_id, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.position - b.position || a.locator - b.locator);
  return map;
}

/**
 * % de conclusão: tarefa sem subtarefas usa o % informado; box com tarefas abaixo
 * soma cada tarefa ponderada pelo peso definido pelo usuário (peso sobre o total).
 * Sem pesos informados, todas as tarefas pesam igual.
 */
export function computeProgress(nodes: MytosisNode[]) {
  const children = childrenMap(nodes);
  const result = new Map<string, number>();
  const visiting = new Set<string>();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const calc = (id: string): number => {
    if (result.has(id)) return result.get(id)!;
    const node = byId.get(id);
    if (!node) return 0;
    const kids = children.get(id) ?? [];
    if (!kids.length || visiting.has(id)) {
      const value = clamp(Number(node.progress) || 0);
      result.set(id, value);
      return value;
    }
    visiting.add(id);
    const totalWeight = kids.reduce((sum, k) => sum + (Number(k.weight) || 0), 0);
    const value = totalWeight > 0
      ? kids.reduce((sum, k) => sum + (Number(k.weight) || 0) * calc(k.id), 0) / totalWeight
      : kids.reduce((sum, k) => sum + calc(k.id), 0) / kids.length;
    visiting.delete(id);
    const rounded = clamp(Math.round(value * 10) / 10);
    result.set(id, rounded);
    return rounded;
  };
  for (const node of nodes) calc(node.id);
  return result;
}

const clamp = (v: number) => Math.min(100, Math.max(0, v));

export function rootObjectiveOf(nodeId: string, nodes: MytosisNode[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let current = byId.get(nodeId);
  const seen = new Set<string>();
  while (current?.parent_id && !seen.has(current.id)) {
    seen.add(current.id);
    current = byId.get(current.parent_id);
  }
  return current ?? null;
}

export function descendantIds(rootId: string, nodes: MytosisNode[]) {
  const children = childrenMap(nodes);
  const out = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    for (const kid of children.get(id) ?? []) stack.push(kid.id);
  }
  return out;
}

/** Fase horizontal de cada box: fase do box-pai + cadeia de predecessores entre irmãos. */
export function computePhases(rootId: string, nodes: MytosisNode[], links: MytosisLink[]) {
  const ids = descendantIds(rootId, nodes);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const preds = new Map<string, string[]>();
  for (const link of links) {
    const a = byId.get(link.predecessor_id);
    const b = byId.get(link.successor_id);
    if (!a || !b || !ids.has(a.id) || !ids.has(b.id) || a.parent_id !== b.parent_id) continue;
    preds.set(b.id, [...(preds.get(b.id) ?? []), a.id]);
  }
  const phase = new Map<string, number>();
  const visiting = new Set<string>();
  const calc = (id: string): number => {
    if (phase.has(id)) return phase.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const node = byId.get(id)!;
    const base = node.parent_id && ids.has(node.parent_id) && id !== rootId ? calc(node.parent_id) : 0;
    const p = preds.get(id) ?? [];
    const value = p.length ? Math.max(...p.map((x) => calc(x) + 1)) : base;
    visiting.delete(id);
    phase.set(id, Math.max(value, base));
    return phase.get(id)!;
  };
  for (const id of ids) calc(id);
  const last = Math.max(0, ...phase.values());
  return { phase, last };
}

/** Caminho crítico: todos os boxes ainda pendentes (< 100%) do início ao fim do objetivo, incluindo o próprio objetivo. */
export function criticalPath(rootId: string, nodes: MytosisNode[], links: MytosisLink[]) {
  const progress = computeProgress(nodes);
  const ids = descendantIds(rootId, nodes);
  const predMap = new Map<string, string[]>();
  for (const l of links) predMap.set(l.successor_id, [...(predMap.get(l.successor_id) ?? []), l.predecessor_id]);
  const stack = [...ids];
  while (stack.length) {
    const id = stack.pop()!;
    for (const p of predMap.get(id) ?? []) if (!ids.has(p)) { ids.add(p); stack.push(p); }
  }
  return new Set([...ids].filter((id) => (progress.get(id) ?? 0) < 100));
}

export type PendingGroup = { key: string; label: string; items: MytosisNode[] };

export function groupPendings(
  nodes: MytosisNode[],
  by: "responsible" | "date",
  nameOf: (id: string | null) => string,
) {
  const progress = computeProgress(nodes);
  const pending = nodes.filter((n) => n.kind === "task" && !n.is_process && (progress.get(n.id) ?? 0) < 100);
  const groups = new Map<string, PendingGroup>();
  for (const node of pending) {
    const key = by === "responsible" ? node.responsible_id ?? "" : node.due_date ?? "";
    const label = by === "responsible" ? (node.responsible_id ? nameOf(node.responsible_id) : "Sem responsável") : node.due_date ? formatDate(node.due_date) : "Sem data";
    const group = groups.get(key) ?? { key, label, items: [] };
    group.items.push(node);
    groups.set(key, group);
  }
  const list = [...groups.values()];
  for (const g of list) g.items.sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || a.locator - b.locator);
  return by === "date"
    ? list.sort((a, b) => (a.key || "9999").localeCompare(b.key || "9999"))
    : list.sort((a, b) => (a.key ? 0 : 1) - (b.key ? 0 : 1) || a.label.localeCompare(b.label, "pt-BR"));
}

export function formatDate(value: string | null) {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Ordena a cópia de um bloco (pais antes dos filhos) e as ligações internas, para importar um fluxograma em outro box. */
export function planBlockImport(sourceRootId: string, nodes: MytosisNode[], links: MytosisLink[]) {
  const scope = descendantIds(sourceRootId, nodes);
  const kids = childrenMap(nodes);
  const ordered: MytosisNode[] = [];
  const queue = nodes.filter((n) => n.id === sourceRootId);
  while (queue.length) { const n = queue.shift()!; ordered.push(n); queue.push(...(kids.get(n.id) ?? [])); }
  const internalLinks = links.filter((l) => scope.has(l.predecessor_id) && scope.has(l.successor_id));
  return { ordered, internalLinks };
}
