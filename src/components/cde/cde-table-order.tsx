import { CdeSection } from "./cde-section";
import { CdeButton } from "./cde-button";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { CdeCategoryHeader } from "./cde-category-header";
import { TABLE_ORDER_GROUP, useTableColumnOrders, type TableColumnOrders } from "./table-column-order";
import library from "./table-library.json";

type Site = { id: string; file: string; line: number; context: string; headers: string[] };

/** App > Menu by source file; Submenu comes from the nearest title above the list. */
function appMenu(file: string): [string, string] {
  const f = file.replace(/^.*\//, "");
  if (file.includes("cash-flow/")) return ["Finance", "Financeiro"];
  if (file.includes("mytosis/")) return ["Mytosis", f.startsWith("okrs") ? "OKRs" : f.startsWith("kpis") ? "KPIs" : "Usuários"];
  if (f === "chamados.tsx") return ["OpDesk", "Chamados"];
  if (f === "development.tsx") return ["Code", "Tickets"];
  if (f.startsWith("site-survey")) return ["Site Survey", "Configurações"];
  if (f.startsWith("user-manuals")) return ["Central", "Manuais"];
  if (/^(stock|tools|damaged|distribution|homologation|import-batches|technician|unit-products|bom|assembly|external-sync|myio-demand|material)/.test(f)) return ["Supply", "Estoque"];
  if (/^(approval|additional-step|request-types|delivery-points|damage-reasons|stock-destinations|supply-order-statuses|supply-tags|cost-centers|clients|client-categories|job-titles|access-profile|material-stock-types)/.test(f)) return ["Supply", "Configurações"];
  if (f === "dashboard.tsx" || f.startsWith("supply") || f.startsWith("myio-orders")) return ["Supply", "Solicitações"];
  return ["ERP", f.replace(/\.tsx$/, "")];
}

function Head({ id, label }: { id: number; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="flex shrink-0 items-center gap-1 border-b border-border bg-card py-1.5 pr-3 text-[length:var(--th-fs)] text-muted-foreground">
    <Button variant="ghost" size="compactIcon" aria-label={`Arrastar ${label}`} title={`Arrastar ${label}`} className="touch-none cursor-grab text-foreground" {...attributes} {...listeners}><GripVertical /></Button>
    <span className="whitespace-nowrap">{label}</span>
  </div>;
}

function TableRowEditor({ site, order, onChange }: { site: Site; order: number[]; onChange: (o: number[]) => void }) {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const move = (e: DragEndEvent) => { if (!e.over || e.active.id === e.over.id) return; onChange(arrayMove(order, order.indexOf(Number(e.active.id)), order.indexOf(Number(e.over.id)))); };
  return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={move}>
    <SortableContext items={order} strategy={horizontalListSortingStrategy}>
      <div className="flex flex-wrap gap-x-2">{order.map((i) => <Head key={i} id={i} label={site.headers[i]} />)}</div>
    </SortableContext>
  </DndContext>;
}

export function CdeTableOrder({ number, handle, embedded }: { number?: number; handle?: import("react").ReactNode; embedded?: boolean }) {
  const [open, setOpen] = useState(!!embedded);
  const [contentOpen, setContentOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<TableColumnOrders | null>(null);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const saved = useTableColumnOrders().data ?? {};
  const orders = draft ?? saved;
  const sites = library as Site[];
  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const map = new Map<string, { site: Site; path: string }[]>();
    for (const site of sites) {
      const [app, menu] = appMenu(site.file);
      const path = `${app} > ${menu} > ${site.context || "Lista"}`;
      if (term && !`${path} ${site.headers.join(" ")}`.toLowerCase().includes(term)) continue;
      map.set(app, [...(map.get(app) ?? []), { site, path }]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [sites, search]);
  const orderOf = (s: Site) => { const o = orders[s.id]; return o && o.length === s.headers.length ? o : s.headers.map((_, i) => i); };
  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão não encontrada");
      const clean = Object.fromEntries(Object.entries(draft).filter(([, o]) => o.some((v, i) => v !== i)));
      const existing = await supabase.from("cde_selected").select("variant_key").eq("group_key", TABLE_ORDER_GROUP).eq("is_primary", true).maybeSingle();
      if (existing.error) throw existing.error;
      const row = { variant_key: JSON.stringify(clean), chosen_by: user.id };
      const result = existing.data ? await supabase.from("cde_selected").update(row).eq("group_key", TABLE_ORDER_GROUP).eq("variant_key", existing.data.variant_key) : await supabase.from("cde_selected").insert({ ...row, group_key: TABLE_ORDER_GROUP });
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: ["cde-table-column-order"] });
      setDraft(null); toast.success("Ordem dos cabeçalhos aplicada nos apps");
    } catch { toast.error("Não foi possível salvar a ordem."); } finally { setSaving(false); }
  }
  return <section className="cde-category-sections">
    {embedded ? <p className="text-sm font-medium">Ordem das colunas <span className="font-normal text-muted-foreground">— arraste as colunas de cada lista de dados</span></p> : <CdeCategoryHeader handle={handle} number={number ?? 0} title="Ordenação de cabeçalhos" hint="Arraste as colunas de cada lista de dados" open={open} onToggle={() => setOpen(!open)} />}
    {open && <CdeSection title="Ordem das colunas" open={contentOpen} actions={<><Button variant="ghost" size="icon" aria-label="Salvar" title="Salvar ordem dos cabeçalhos" onClick={save} disabled={saving || !draft || JSON.stringify(draft) === JSON.stringify(saved)}><Save /></Button><CdeButton group="toggle" screen="components/cde/cde-table-order.tsx" aria-label={`${contentOpen ? "Recolher" : "Exibir"} ordem das colunas`} title={`${contentOpen ? "Recolher" : "Exibir"} ordem das colunas`} aria-expanded={contentOpen} onClick={() => setContentOpen(!contentOpen)} /></>}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar app, menu ou coluna" className="max-w-xs text-[length:var(--filter-fs)]" />

      </div>
      {groups.map(([app, items]) => <div key={app} className="space-y-3">
        <p className="text-sm font-medium">{app}</p>
        {items.map(({ site, path }) => <div key={site.id} className="space-y-1 border-l-2 border-border pl-3">
          <div className="flex items-center gap-2"><p className="text-xs text-muted-foreground">{path}</p>
            {orders[site.id] && <Button variant="ghost" size="compactIcon" aria-label="Restaurar ordem original" title="Restaurar ordem original" onClick={() => { const { [site.id]: _, ...rest } = orders; setDraft(rest); }}><RotateCcw /></Button>}
          </div>
          <TableRowEditor site={site} order={orderOf(site)} onChange={(o) => setDraft({ ...orders, [site.id]: o })} />
        </div>)}
      </div>)}
      <p className="text-xs text-muted-foreground">Colunas marcadas como condicionais só aparecem em certas situações; a ordem é mantida quando surgem.</p>
    </CdeSection>}
  </section>;
}
