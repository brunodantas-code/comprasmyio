import { useEffect, useState, type RefObject } from "react";
import type { MytosisNode, MytosisLink } from "@/lib/mytosis";
import { borderOf } from "./shapes";

type Point = { x: number; y: number; color: string };
type Edge = { id: string; from: Point; to: Point; vertical: boolean; style: string };

/** Measure the rendered tree so every relationship attaches to the actual box sides. */
export function ConnectionLayer({ container, nodes, links, layoutKey }: { container: RefObject<HTMLDivElement | null>; nodes: MytosisNode[]; links: MytosisLink[]; layoutKey: string }) {
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
          let hidden = false;
          while (parent && parent !== root) {
            const bounds = parent.getBoundingClientRect();
            if (bounds.width < 1 || bounds.height < 1) hidden = true;
            parent = parent.parentElement;
          }
          if (id && rect.width > 40 && rect.height > 1 && !hidden) boxes.set(id, rect);
        });
        const byId = new Map(nodes.map((node) => [node.id, node]));
        const point = (id: string, side: "left" | "right" | "top" | "bottom"): Point | null => {
          const box = boxes.get(id);
          if (!box) return null;
          return {
            x: box.left - origin.left + box.width * (side === "left" ? .02 : side === "right" ? .98 : .5),
            y: box.top - origin.top + box.height * (side === "top" ? 2 / 60 : side === "bottom" ? 58 / 60 : .5),
            color: borderOf(byId.get(id)?.border_color).color,
          };
        };
        const relations = [
          ...nodes.filter((node) => node.parent_id && !links.some((link) => link.successor_id === node.id && byId.get(link.predecessor_id)?.parent_id === node.parent_id)).map((node) => ({ from: node.parent_id ?? "", to: node.id, vertical: true, style: "line" })),
          ...links.map((link) => ({ from: link.predecessor_id, to: link.successor_id, vertical: false, style: link.style ?? "arrow" })),
        ];
        setEdges(relations.flatMap((edge) => {
          const from = point(edge.from, edge.vertical ? "bottom" : "right");
          const to = point(edge.to, edge.vertical ? "top" : "left");
          return from && to ? [{ id: `${edge.from}-${edge.to}`, from, to, vertical: edge.vertical, style: edge.style }] : [];
        }));
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    root.querySelectorAll("[data-mytosis-node]").forEach((element) => observer.observe(element));
    measure();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [container, nodes, links, layoutKey]);

  const ports = new Map<string, Point>();
  for (const edge of edges) for (const point of [edge.from, edge.to]) ports.set(`${point.x}-${point.y}`, point);
  const radius = 3;
  return <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
    {edges.map(({ id, from, to, vertical, style }) => {
      const start = { x: from.x + (vertical ? 0 : radius), y: from.y + (vertical ? radius : 0) };
      const end = { x: to.x - (vertical ? 0 : radius), y: to.y - (vertical ? radius : 0) };
      const mid = vertical ? (start.y + end.y) / 2 : (start.x + end.x) / 2;
      const path = vertical ? `M${start.x} ${start.y} V${mid} H${end.x} V${end.y}` : `M${start.x} ${start.y} H${mid} V${end.y} H${end.x}`;
      return <g key={id} fill="none" stroke={from.color} strokeWidth={1} strokeLinejoin="round">
        <path d={path} strokeDasharray={style === "dashed" ? "4 3" : undefined} />
        {style === "arrow" || style === "double" ? <path d={vertical ? `M${end.x - 3} ${end.y - 5} L${end.x} ${end.y} L${end.x + 3} ${end.y - 5}` : `M${end.x - 5} ${end.y - 3} L${end.x} ${end.y} L${end.x - 5} ${end.y + 3}`} /> : null}
        {style === "double" ? <path d={`M${start.x + 5} ${start.y - 3} L${start.x} ${start.y} L${start.x + 5} ${start.y + 3}`} /> : null}
      </g>;
    })}
    {[...ports].map(([key, point]) => <circle key={key} cx={point.x} cy={point.y} r={radius} fill="none" stroke={point.color} strokeWidth={1} />)}
  </svg>;
}