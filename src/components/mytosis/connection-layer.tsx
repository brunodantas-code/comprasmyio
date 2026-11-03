import { useEffect, useState, type RefObject } from "react";
import type { MytosisNode, MytosisLink } from "@/lib/mytosis";
import { borderOf } from "./shapes";
import { connectorRelations, portDirection, routeConnector, type ConnectorBox, type ConnectorPoint, type ConnectorSide } from "@/lib/mytosis-connectors";

type Point = { x: number; y: number; color: string };
type Edge = { id: string; from: Point; to: Point; points: ConnectorPoint[]; fromSide: ConnectorSide; toSide: ConnectorSide; style: string; color?: string | null; link?: MytosisLink };

/** Measure the rendered tree so every relationship attaches to the actual box sides. */
export function ConnectionLayer({ container, nodes, links, layoutKey, onSelect }: { container: RefObject<HTMLDivElement | null>; nodes: MytosisNode[]; links: MytosisLink[]; layoutKey: string; onSelect?: (link: MytosisLink) => void }) {
  const [edges, setEdges] = useState<Edge[]>([]);
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const origin = root.getBoundingClientRect();
        const boxes = new Map<string, DOMRect>();
        root.querySelectorAll<HTMLElement>("[data-mytosis-node]").forEach((element) => {
          const id = element.dataset.mytosisNode;
          const rect = element.getBoundingClientRect();
          let parent = element.parentElement;
          let hidden = element.dataset.mytosisCollapsed === "true";
          while (parent && parent !== root) {
            const bounds = parent.getBoundingClientRect();
            if (parent.dataset.mytosisHidden === "true" || bounds.width < 1 || bounds.height < 1) hidden = true;
            parent = parent.parentElement;
          }
          if (id && rect.width > 40 && rect.height > 1 && !hidden) boxes.set(id, rect);
        });
        const byId = new Map(nodes.map((node) => [node.id, node]));
        const measured: ConnectorBox[] = [...boxes].map(([id, box]) => ({ id, left: box.left - origin.left + box.width * .02, right: box.right - origin.left - box.width * .02, top: box.top - origin.top + box.height * 2 / 60, bottom: box.bottom - origin.top - box.height * 2 / 60 }));
        const bounds = new Map(measured.map((box) => [box.id, box]));
        const visibleRoot = nodes.find((node) => boxes.has(node.id) && !node.parent_id);
        const relations = connectorRelations(nodes, links, !!visibleRoot?.is_process);
        setEdges(relations.flatMap((edge) => {
          const a = bounds.get(edge.from), b = bounds.get(edge.to);
          if (!a || !b) return [];
          const route = routeConnector(a, b, measured);
          if (!route) return [];
          const from = { ...route.points[0], color: borderOf(byId.get(edge.from)?.border_color).color };
          const to = { ...route.points[route.points.length - 1], color: borderOf(byId.get(edge.to)?.border_color).color };
          return [{ id: `${edge.from}-${edge.to}`, from, to, ...route, style: edge.link ? edge.link.style ?? "arrow" : "line", color: edge.link?.color, link: edge.link }];
        }));
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    root.querySelectorAll("[data-mytosis-node],[data-mytosis-hidden]").forEach((element) => observer.observe(element));
    measure();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [container, nodes, links, layoutKey]);

  const ports = new Map<string, Point>();
  for (const edge of edges) for (const point of [edge.from, edge.to]) ports.set(`${point.x}-${point.y}`, point);
  const radius = 3;
  return <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
    {edges.map(({ id, from, to, points, fromSide, toSide, style, color, link }) => {
      const da = portDirection(fromSide), db = portDirection(toSide);
      const start = { x: from.x + da.x * radius, y: from.y + da.y * radius };
      const end = { x: to.x + db.x * radius, y: to.y + db.y * radius };
      const path = [start, ...points.slice(1, -1), end].map((point, index) => `${index ? "L" : "M"}${point.x} ${point.y}`).join(" ");
      const arrow = (tip: ConnectorPoint, outward: ConnectorPoint) => `M${tip.x + outward.x * 5 - outward.y * 3} ${tip.y + outward.y * 5 + outward.x * 3} L${tip.x} ${tip.y} L${tip.x + outward.x * 5 + outward.y * 3} ${tip.y + outward.y * 5 - outward.x * 3}`;
      const label = link ? `Editar conector ${nodes.find((n) => n.id === link.predecessor_id)?.title} para ${nodes.find((n) => n.id === link.successor_id)?.title}` : undefined;
      return <g key={id} fill="none" stroke={color ? borderOf(color).color : from.color} strokeWidth={1} strokeLinejoin="round">
        {link && onSelect ? <path d={path} stroke="transparent" strokeWidth={14} className="cursor-pointer [pointer-events:stroke]" role="button" tabIndex={0} aria-label={label} onClick={(e) => { e.stopPropagation(); onSelect(link); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(link); } }}><title>{label}</title></path> : null}
        <path d={path} strokeDasharray={style === "dashed" ? "4 3" : undefined} />
        {style === "arrow" || style === "double" ? <path d={arrow(end, db)} /> : null}
        {style === "double" ? <path d={arrow(start, da)} /> : null}
      </g>;
    })}
    {[...ports].map(([key, point]) => <circle key={key} cx={point.x} cy={point.y} r={radius} fill="var(--mytosis-text-light)" stroke={point.color} strokeWidth={1} />)}
  </svg>;
}