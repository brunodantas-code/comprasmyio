import { useEffect, useState, type RefObject } from "react";
import type { MytosisNode, MytosisLink } from "@/lib/mytosis";
import { borderOf } from "./shapes";

type Point = { x: number; y: number; color: string };
type Edge = { id: string; from: Point; to: Point; vertical: boolean; style: string; color?: string | null; link?: MytosisLink };

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
        const point = (id: string, side: "left" | "right" | "top" | "bottom"): Point | null => {
          const box = boxes.get(id);
          if (!box) return null;
          return {
            x: box.left - origin.left + box.width * (side === "left" ? .02 : side === "right" ? .98 : .5),
            y: box.top - origin.top + box.height * (side === "top" ? 2 / 60 : side === "bottom" ? 58 / 60 : .5),
            color: borderOf(byId.get(id)?.border_color).color,
          };
        };
        const relations: { from: string; to: string; vertical: boolean; style: string; color?: string | null; link?: MytosisLink }[] = [
          ...nodes.filter((node) => node.parent_id && !links.some((link) => link.successor_id === node.id && byId.get(link.predecessor_id)?.parent_id === node.parent_id)).map((node) => ({ from: node.parent_id ?? "", to: node.id, vertical: true, style: "line" })),
          ...links.map((link) => {
            const a = boxes.get(link.predecessor_id), b = boxes.get(link.successor_id);
            const vertical = !!a && !!b && Math.abs(a.left - b.left) < a.width / 2 && b.top > a.bottom;
            return { from: link.predecessor_id, to: link.successor_id, vertical, style: link.style ?? "arrow", color: link.color, link };
          }),
        ];
        setEdges(relations.flatMap((edge) => {
          const from = point(edge.from, edge.vertical ? "bottom" : "right");
          const to = point(edge.to, edge.vertical ? "top" : "left");
          return from && to ? [{ id: `${edge.from}-${edge.to}`, from, to, vertical: edge.vertical, style: edge.style, color: edge.color, link: edge.link }] : [];
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
    {edges.map(({ id, from, to, vertical, style, color, link }) => {
      const start = { x: from.x + (vertical ? 0 : radius), y: from.y + (vertical ? radius : 0) };
      const end = { x: to.x - (vertical ? 0 : radius), y: to.y - (vertical ? radius : 0) };
      const mid = vertical ? (start.y + end.y) / 2 : (start.x + end.x) / 2;
      const path = vertical ? `M${start.x} ${start.y} V${mid} H${end.x} V${end.y}` : Math.abs(start.y - end.y) < 1 ? `M${start.x} ${start.y} H${end.x}` : end.x < start.x ? `M${start.x} ${start.y} H${start.x + 12} V${(start.y + end.y) / 2} H${end.x - 12} V${end.y} H${end.x}` : `M${start.x} ${start.y} H${mid} V${end.y} H${end.x}`;
      const label = link ? `Editar conector ${nodes.find((n) => n.id === link.predecessor_id)?.title} para ${nodes.find((n) => n.id === link.successor_id)?.title}` : undefined;
      return <g key={id} fill="none" stroke={color ? borderOf(color).color : from.color} strokeWidth={1} strokeLinejoin="round">
        {link && onSelect ? <path d={path} stroke="transparent" strokeWidth={14} className="cursor-pointer [pointer-events:stroke]" role="button" tabIndex={0} aria-label={label} onClick={(e) => { e.stopPropagation(); onSelect(link); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(link); } }}><title>{label}</title></path> : null}
        <path d={path} strokeDasharray={style === "dashed" ? "4 3" : undefined} />
        {style === "arrow" || style === "double" ? <path d={vertical ? `M${end.x - 3} ${end.y - 5} L${end.x} ${end.y} L${end.x + 3} ${end.y - 5}` : `M${end.x - 5} ${end.y - 3} L${end.x} ${end.y} L${end.x - 5} ${end.y + 3}`} /> : null}
        {style === "double" ? <path d={`M${start.x + 5} ${start.y - 3} L${start.x} ${start.y} L${start.x + 5} ${start.y + 3}`} /> : null}
      </g>;
    })}
    {[...ports].map(([key, point]) => <circle key={key} cx={point.x} cy={point.y} r={radius} fill="none" stroke={point.color} strokeWidth={1} />)}
  </svg>;
}