import { useEffect, useState, type RefObject } from "react";
import type { MytosisNode, MytosisLink } from "@/lib/mytosis";
import { borderOf } from "./shapes";
import { connectorRelations, portDirection, routeConnector, type ConnectorBox, type ConnectorPoint, type ConnectorSide } from "@/lib/mytosis-connectors";

type Point = { x: number; y: number; color: string };
type Edge = { id: string; from: Point; to: Point; points: ConnectorPoint[]; fromSide: ConnectorSide; toSide: ConnectorSide; style: string; color?: string | null; link?: MytosisLink };

/** Measure the rendered tree so every relationship attaches to the actual box sides. */
export function ConnectionLayer({ container, nodes, links, layoutKey, onSelect, process, isLinkEditable }: { container: RefObject<HTMLDivElement | null>; nodes: MytosisNode[]; links: MytosisLink[]; layoutKey: string; onSelect?: (link: MytosisLink) => void; process?: boolean; isLinkEditable?: (link: MytosisLink) => boolean }) {
  const [edges, setEdges] = useState<Edge[]>([]);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    let frame = 0;
    let animateUntil = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const origin = root.getBoundingClientRect();
        setSize({ width: Math.ceil(root.scrollWidth), height: Math.ceil(root.scrollHeight) });
        const boxes = new Map<string, DOMRect>();
        const collapsedObstacles: ConnectorBox[] = [];
        root.querySelectorAll<HTMLElement>("[data-mytosis-node]").forEach((element) => {
          const id = element.dataset.mytosisNode;
          const rect = (element.querySelector("[data-mytosis-surface]") ?? element).getBoundingClientRect();
          let parent = element.parentElement;
          const collapsed = element.dataset.mytosisCollapsed === "true";
          let hidden = false;
          while (parent && parent !== root) {
            const bounds = parent.getBoundingClientRect();
            if (parent.dataset.mytosisHidden === "true" || bounds.width < 1 || bounds.height < 1) hidden = true;
            const style = getComputedStyle(parent);
            if ((style.overflowX === "hidden" && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1)) || (style.overflowY === "hidden" && (rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1))) hidden = true;
            parent = parent.parentElement;
          }
          if (id && rect.width > 1 && rect.height > 1 && !hidden && collapsed) collapsedObstacles.push({ id: `${id}-collapsed`, left: rect.left - origin.left, right: rect.right - origin.left, top: rect.top - origin.top, bottom: rect.bottom - origin.top });
          if (id && rect.width > 40 && rect.height > 1 && !hidden && !collapsed) boxes.set(id, rect);
        });
        const byId = new Map(nodes.map((node) => [node.id, node]));
        const measured: ConnectorBox[] = [...boxes].map(([id, box]) => {
          const shape = byId.get(id)?.shape;
          const left = shape === "io" ? .08 : .02;
          const right = shape === "io" ? .92 : shape === "multidoc" ? .90 : .98;
          const top = shape === "manual" || shape === "multidoc" ? 10 / 60 : 2 / 60;
          const bottom = shape === "document" ? 57 / 60 : 58 / 60;
          return { id, left: box.left - origin.left + box.width * left, right: box.left - origin.left + box.width * right, top: box.top - origin.top + box.height * top, bottom: box.top - origin.top + box.height * bottom };
        });
        const chrome: ConnectorBox[] = [];
        root.querySelectorAll<HTMLElement>("[data-mytosis-node]").forEach((element) => {
          const id = element.dataset.mytosisNode;
          const surface = boxes.get(id ?? "");
          if (!id || !surface) return;
          const whole = element.getBoundingClientRect();
          if (surface.top - whole.top > 2) chrome.push({ id: `${id}-header`, left: whole.left - origin.left, right: whole.right - origin.left, top: whole.top - origin.top, bottom: surface.top - origin.top - 1 });
          if (whole.bottom - surface.bottom > 2) chrome.push({ id: `${id}-footer`, left: whole.left - origin.left, right: whole.right - origin.left, top: surface.bottom - origin.top + 1, bottom: whole.bottom - origin.top });
        });
        const bounds = new Map(measured.map((box) => [box.id, box]));
        const visibleRoot = nodes.find((node) => boxes.has(node.id) && !node.parent_id);
        const relations = connectorRelations(nodes, links, process ?? !!visibleRoot?.is_process);
        setRevision((value) => value + 1);
        setEdges(relations.flatMap((edge) => {
          const a = bounds.get(edge.from), b = bounds.get(edge.to);
          if (!a || !b) return [];
          const route = routeConnector(a, b, [...measured, ...collapsedObstacles, ...chrome.filter((item) => !item.id.startsWith(`${edge.from}-`) && !item.id.startsWith(`${edge.to}-`))]);
          if (!route) return [];
          const from = { ...route.points[0], color: borderOf(byId.get(edge.from)?.border_color).color };
          const to = { ...route.points[route.points.length - 1], color: borderOf(byId.get(edge.to)?.border_color).color };
          return [{ id: `${edge.from}-${edge.to}`, from, to, ...route, style: edge.link ? edge.link.style ?? "arrow" : "line", color: edge.link?.color, link: edge.link }];
        }));
        if (performance.now() < animateUntil) measure();
      });
    };
    const transition = () => { animateUntil = performance.now() + 650; measure(); };
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    root.querySelectorAll("[data-mytosis-node],[data-mytosis-hidden]").forEach((element) => observer.observe(element));
    const mutations = new MutationObserver((records) => {
      if (records.some((record) => record.target instanceof HTMLElement && !record.target.closest("svg"))) transition();
    });
    mutations.observe(root, { subtree: true, attributes: true, attributeFilter: ["data-mytosis-hidden", "data-mytosis-collapsed", "style"], childList: true });
    root.addEventListener("transitionrun", transition);
    root.addEventListener("transitionend", measure);
    root.addEventListener("transitioncancel", measure);
    measure();
    return () => { observer.disconnect(); mutations.disconnect(); root.removeEventListener("transitionrun", transition); root.removeEventListener("transitionend", measure); root.removeEventListener("transitioncancel", measure); cancelAnimationFrame(frame); };
  }, [container, nodes, links, layoutKey, process]);

  const ports = new Map<string, Point>();
  for (const edge of edges) for (const point of [edge.from, edge.to]) ports.set(`${point.x}-${point.y}`, point);
  const radius = 3;
  return <svg key={revision} data-mytosis-connectors width={size.width} height={size.height} viewBox={`0 0 ${size.width} ${size.height}`} className="pointer-events-none absolute left-0 top-0 overflow-hidden">
    {edges.map(({ id, from, to, points, fromSide, toSide, style, color, link }) => {
      const da = portDirection(fromSide), db = portDirection(toSide);
      const start = { x: from.x + da.x * radius, y: from.y + da.y * radius };
      const end = { x: to.x + db.x * radius, y: to.y + db.y * radius };
      const path = [start, ...points.slice(1, -1), end].map((point, index) => `${index ? "L" : "M"}${point.x} ${point.y}`).join(" ");
      const arrow = (tip: ConnectorPoint, outward: ConnectorPoint) => `M${tip.x + outward.x * 5 - outward.y * 3} ${tip.y + outward.y * 5 + outward.x * 3} L${tip.x} ${tip.y} L${tip.x + outward.x * 5 + outward.y * 3} ${tip.y + outward.y * 5 - outward.x * 3}`;
      const label = link ? `Editar conector ${nodes.find((n) => n.id === link.predecessor_id)?.title} para ${nodes.find((n) => n.id === link.successor_id)?.title}` : undefined;
      return <g key={id} fill="none" stroke={color ? borderOf(color).color : from.color} strokeWidth={1} strokeLinejoin="round">
        {link && onSelect && (isLinkEditable?.(link) ?? true) ? <path d={path} stroke="transparent" strokeWidth={14} className="cursor-pointer [pointer-events:stroke]" role="button" tabIndex={0} aria-label={label} onClick={(e) => { e.stopPropagation(); onSelect(link); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(link); } }}><title>{label}</title></path> : null}
        <path d={path} strokeDasharray={style === "dashed" ? "4 3" : undefined} />
        {style === "arrow" || style === "double" ? <path d={arrow(end, db)} /> : null}
        {style === "double" ? <path d={arrow(start, da)} /> : null}
      </g>;
    })}
    {[...ports].map(([key, point]) => <circle key={key} cx={point.x} cy={point.y} r={radius} fill="var(--mytosis-text-light)" stroke={point.color} strokeWidth={1} />)}
  </svg>;
}