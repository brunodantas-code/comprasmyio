import { useEffect, useRef, useState } from "react";
import { MapPinned } from "lucide-react";
import Brazil from "@svg-maps/brazil";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ClientCategory } from "@/components/client-categories-tab";
import type { Client, ClientUnit } from "@/components/clients-tab";

type Marker = { x: number; y: number };
type BrazilLocation = { id: string; name: string; path: string };
type MapEntry = { id: string; name: string; state: string; categoryId: string | null; corporateName: string; kind: "Cliente corporativo" | "Unidade" };

export function ClientsMapDialog({ clients, units, categories }: { clients: Client[]; units: ClientUnit[]; categories: ClientCategory[] }) {
  const [open, setOpen] = useState(false);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("all");
  const [markers, setMarkers] = useState<Record<string, Marker>>({});
  const svgRef = useRef<SVGSVGElement>(null);
  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const clientIdsWithUnits = new Set(units.filter((unit) => unit.active).map((unit) => unit.client_id));
  const entries: MapEntry[] = [
    ...clients.filter((client) => client.state && !clientIdsWithUnits.has(client.id)).map((client) => ({ id: `client-${client.id}`, name: client.name, state: client.state?.toUpperCase() ?? "", categoryId: client.category_id, corporateName: client.name, kind: "Cliente corporativo" as const })),
    ...units.filter((unit) => unit.active && unit.state).map((unit) => ({ id: `unit-${unit.id}`, name: unit.name, state: unit.state?.toUpperCase() ?? "", categoryId: unit.category_id, corporateName: clientsById.get(unit.client_id)?.name ?? "—", kind: "Unidade" as const })),
  ];
  const filteredEntries = categoryId === "all" ? entries : entries.filter((entry) => entry.categoryId === categoryId);
  const entriesByState = filteredEntries.reduce<Record<string, MapEntry[]>>((groups, entry) => {
    const state = entry.state;
    if (!state) return groups;
    groups[state] = [...(groups[state] ?? []), entry];
    return groups;
  }, {});
  const visibleState = selectedState ?? hoveredState;
  const visibleEntries = visibleState ? entriesByState[visibleState] ?? [] : [];

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const svg = svgRef.current;
      if (!svg) return;
      const next: Record<string, Marker> = {};
      svg.querySelectorAll<SVGPathElement>("path[data-state]").forEach((path) => {
        const state = path.dataset.state;
        if (!state) return;
        const box = path.getBBox();
        next[state] = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      });
      setMarkers(next);
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setHoveredState(null);
      setSelectedState(null);
    }
  }

  return <Dialog open={open} onOpenChange={handleOpenChange}>
    <DialogTrigger asChild><Button type="button" size="compactIcon" variant="ghost" title="Mapa de unidades por UF" aria-label="Mapa de unidades por UF"><MapPinned /></Button></DialogTrigger>
    <DialogContent className="max-w-5xl overflow-hidden">
      <DialogHeader className="flex-row items-center justify-between gap-4 pr-8">
        <DialogTitle>Clientes por UF</DialogTitle>
        <Select value={categoryId} onValueChange={(value) => { setCategoryId(value); setHoveredState(null); setSelectedState(null); }}>
          <SelectTrigger className="w-52" aria-label="Filtrar mapa por categoria"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.filter((category) => category.active).map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </DialogHeader>
      <div className="relative min-h-[34rem] overflow-hidden rounded-md border bg-muted/20" onClick={() => setSelectedState(null)}>
        <svg ref={svgRef} viewBox={Brazil.viewBox} className="mx-auto h-[34rem] w-full max-w-2xl" role="img" aria-label="Mapa interativo do Brasil com unidades por estado">
          {(Brazil.locations as BrazilLocation[]).map((location) => {
            const state = location.id.toUpperCase();
            const active = visibleState === state;
            return <path key={location.id} data-state={state} d={location.path} onMouseEnter={() => setHoveredState(state)} onMouseLeave={() => setHoveredState(null)} onClick={(event) => { event.stopPropagation(); setSelectedState((current) => current === state ? null : state); }} className={`cursor-pointer stroke-background stroke-[1.5] transition-colors ${active ? "fill-primary/35" : entriesByState[state]?.length ? "fill-primary/20 hover:fill-primary/35" : "fill-muted hover:fill-primary/35"}`}><title>{location.name}: {entriesByState[state]?.length ?? 0} cadastros</title></path>;
          })}
          {Object.entries(entriesByState).map(([state, stateEntries]) => {
            const marker = markers[state];
            if (!marker) return null;
            return <g key={state} className="cursor-pointer" onMouseEnter={() => setHoveredState(state)} onMouseLeave={() => setHoveredState(null)} onClick={(event) => { event.stopPropagation(); setSelectedState((current) => current === state ? null : state); }}>
              <title>Selecionar {state}: {stateEntries.length} cadastros</title>
              <circle cx={marker.x} cy={marker.y} r="13" className={`stroke-background stroke-2 transition-colors ${visibleState === state ? "fill-primary/80" : "fill-primary hover:fill-primary/80"}`} />
              <text x={marker.x} y={marker.y + 4} textAnchor="middle" pointerEvents="none" className="fill-primary-foreground text-[11px] font-bold">{stateEntries.length}</text>
            </g>;
          })}
        </svg>
        {visibleState && <div className={`absolute right-4 top-4 max-h-[28rem] w-72 overflow-y-auto rounded-md border bg-background/95 p-3 shadow-lg backdrop-blur-sm ${selectedState ? "pointer-events-auto" : "pointer-events-none"}`} onClick={(event) => event.stopPropagation()}>
          <p className="font-semibold">{visibleState} · {visibleEntries.length} {visibleEntries.length === 1 ? "cadastro" : "cadastros"}</p>
          {!visibleEntries.length ? <p className="mt-2 text-sm text-muted-foreground">Nenhum cliente cadastrado nesta UF.</p> : <div className="mt-2 space-y-2">{visibleEntries.map((entry) => <div key={entry.id} className="border-t pt-2 first:border-0 first:pt-0"><p className="text-sm font-medium">{entry.name}</p><p className="text-xs text-muted-foreground">{entry.kind}{entry.kind === "Unidade" ? ` · Corporativo: ${entry.corporateName}` : ""}</p></div>)}</div>}
        </div>}
      </div>
    </DialogContent>
  </Dialog>;
}