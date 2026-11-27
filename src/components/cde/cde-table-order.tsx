import { CdeSection } from "./cde-section";
import { CdeButton } from "./cde-button";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, RotateCcw, Save, LayoutGrid, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { CdeCategoryHeader } from "./cde-category-header";
import { TABLE_ORDER_GROUP, useTableColumnOrders, type TableColumnOrders } from "./table-column-order";
import { TABLE_NAMES_GROUP, TABLE_NAMES_QUERY, parseTableColumnNames, useTableColumnNames, type TableColumnNames } from "./table-column-names";
import library from "./table-library.json";
import { AppSymbol } from "./app-tile";

type Site = { id: string; file: string; line: number; context: string; headers: string[] };

/** Nome editado no CDE para um slot; sem edição, vale o texto original do app. */
const nameOf = (site: Site, i: number, names?: TableColumnNames) => names?.[site.id]?.[String(i)] ?? site.headers[i];
const namesDirty = (a: TableColumnNames, b: TableColumnNames) => JSON.stringify(a) !== JSON.stringify(b);

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

function Head({ id, label, editing, canRename, onRename, onEditing }: { id: number; label: string; editing?: boolean; canRename?: boolean; onRename?: (name: string) => void; onEditing?: (on: boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="flex shrink-0 items-center gap-1 border-b border-border bg-card py-1.5 pr-3 text-[length:var(--th-fs)] text-muted-foreground">
    <Button variant="ghost" size="compactIcon" aria-label={`Arrastar ${label}`} title={`Arrastar ${label}`} className="touch-none cursor-grab text-foreground" {...attributes} {...listeners}><GripVertical /></Button>
    {editing
      ? <Input autoFocus value={label} onChange={(e) => onRename?.(e.target.value)} onBlur={() => onEditing?.(false)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") onEditing?.(false); }} aria-label={`Nome da coluna ${label}`} className="h-7 w-32 text-[length:var(--th-fs)]" />
      : <span className="whitespace-nowrap">{label}</span>}
    {canRename && !editing ? <Button variant="ghost" size="compactIcon" aria-label={`Editar nome da coluna ${label}`} title={`Editar nome da coluna ${label}`} className="text-foreground" onClick={() => onEditing?.(true)}><Pencil /></Button> : null}
  </div>;
}

function TableRowEditor({ site, order, onChange, names, onRename, editingKey, onEditing, canRename }: { site: Site; order: number[]; onChange: (o: number[]) => void; names?: TableColumnNames; onRename?: (i: number, name: string) => void; editingKey?: string | null; onEditing?: (key: string | null) => void; canRename?: boolean }) {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const move = (e: DragEndEvent) => { if (!e.over || e.active.id === e.over.id) return; onChange(arrayMove(order, order.indexOf(Number(e.active.id)), order.indexOf(Number(e.over.id)))); };
  return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={move}>
    <SortableContext items={order} strategy={horizontalListSortingStrategy}>
      <div className="flex flex-wrap gap-x-2">{order.map((i) => <Head key={i} id={i} label={nameOf(site, i, names)} editing={editingKey === `${site.id}|${i}`} canRename={canRename} onRename={(name) => onRename?.(i, name)} onEditing={(on) => onEditing?.(on ? `${site.id}|${i}` : null)} />)}</div>
    </SortableContext>
  </DndContext>;
}

export function CdeTableOrder({ number, handle, embedded }: { number?: number; handle?: import("react").ReactNode; embedded?: boolean }) {
  const [open, setOpen] = useState(!!embedded);
  const [contentOpen, setContentOpen] = useState(true);
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<TableColumnOrders | null>(null);
  const [draftNames, setDraftNames] = useState<TableColumnNames | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const saved = useTableColumnOrders().data ?? {};
  const savedNames = useTableColumnNames().data ?? {};
  const names = draftNames ?? savedNames;
  const { data: isAdmin } = useQuery({ queryKey: ["cde-table-names-admin"], queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error } = await supabase.rpc("is_erp_admin", { _user_id: user.id });
    if (error) throw error;
    return !!data;
  } });
  useEffect(() => { if (!draftNames) setEditingKey(null); }, [draftNames]);
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
  const rename = (s: Site, i: number, name: string) => {
    const next: TableColumnNames = { ...names };
    const bySlot = { ...(next[s.id] ?? {}) };
    const trimmed = name.trim();
    if (!trimmed || trimmed === s.headers[i]) delete bySlot[String(i)];
    else bySlot[String(i)] = trimmed;
    if (Object.keys(bySlot).length) next[s.id] = bySlot;
    else delete next[s.id];
    setDraftNames(next);
  };
  async function save() {
    const orderChanged = !!draft;
    const namesChanged = namesDirty(savedNames, names);
    if (!orderChanged && !namesChanged) return;
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão não encontrada");
      if (orderChanged) {
        const clean = Object.fromEntries(Object.entries(draft!).filter(([, o]) => o.some((v, i) => v !== i)));
        const existing = await supabase.from("cde_selected").select("variant_key").eq("group_key", TABLE_ORDER_GROUP).eq("is_primary", true).maybeSingle();
        if (existing.error) throw existing.error;
        const row = { variant_key: JSON.stringify(clean), chosen_by: user.id };
        const result = existing.data ? await supabase.from("cde_selected").update(row).eq("group_key", TABLE_ORDER_GROUP).eq("variant_key", existing.data.variant_key) : await supabase.from("cde_selected").insert({ ...row, group_key: TABLE_ORDER_GROUP });
        if (result.error) throw result.error;
        await qc.invalidateQueries({ queryKey: ["cde-table-column-order"] });
        setDraft(null);
      }
      if (namesChanged) {
        const clean = parseTableColumnNames(JSON.stringify(names));
        const existing = await supabase.from("cde_selected").select("variant_key").eq("group_key", TABLE_NAMES_GROUP).eq("is_primary", true).maybeSingle();
        if (existing.error) throw existing.error;
        const row = { variant_key: JSON.stringify(clean), chosen_by: user.id };
        const result = existing.data
          ? await supabase.from("cde_selected").update(row).eq("group_key", TABLE_NAMES_GROUP).eq("is_primary", true).eq("variant_key", existing.data.variant_key).select("variant_key").single()
          : await supabase.from("cde_selected").insert({ ...row, group_key: TABLE_NAMES_GROUP, is_primary: true }).select("variant_key").single();
        if (result.error) throw result.error;
        if (result.data?.variant_key !== row.variant_key) throw new Error("Salvamento não confirmado");
        qc.setQueryData(TABLE_NAMES_QUERY, clean);
        await qc.invalidateQueries({ queryKey: TABLE_NAMES_QUERY });
        setDraftNames(null);
      }
      toast.success("Cabeçalhos atualizados nos apps");
    } catch { toast.error("Não foi possível salvar os cabeçalhos."); } finally { setSaving(false); }
  }
  return <section className={embedded ? "cde-category-sections cde-shortcut-sections" : "cde-category-sections"}>
    {!embedded && <CdeCategoryHeader handle={handle} number={number ?? 0} title="Ordenação de cabeçalhos" hint="Arraste as colunas de cada lista de dados" open={open} onToggle={() => setOpen(!open)} />}
    {open && <CdeSection title="Ordem das colunas nas listas dos apps" hint="Arraste as colunas de cada lista de dados" open={contentOpen} actions={<><Button variant="ghost" size="icon" aria-label="Salvar" title="Salvar cabeçalhos" onClick={save} disabled={saving || (!draft && !namesDirty(savedNames, names))}><Save /></Button><CdeButton group="toggle" screen="components/cde/cde-table-order.tsx" aria-label={`${contentOpen ? "Recolher" : "Exibir"} ordem das colunas`} title={`${contentOpen ? "Recolher" : "Exibir"} ordem das colunas`} aria-expanded={contentOpen} onClick={() => setContentOpen(!contentOpen)} /></>}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar app, menu ou coluna" className="max-w-xs text-[length:var(--filter-fs)]" />

      </div>
      {groups.map(([app, items]) => <div key={app} className="space-y-3">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--cde-palette-black)]">
              {app === "Central" ? <ListChecks className="h-5 w-5" /> : app === "ERP" ? <LayoutGrid className="h-5 w-5" /> : <AppSymbol name={app} className="h-5 w-5" />}
            </span>
            <h4 className="min-w-0 text-sm font-medium">{app}</h4>
          </div>
          <CdeButton group="toggle" screen="components/cde/cde-table-order.tsx" aria-label={`${expandedApps.has(app) ? "Recolher" : "Exibir"} colunas de ${app}`} title={`${expandedApps.has(app) ? "Recolher" : "Exibir"} colunas de ${app}`} aria-expanded={expandedApps.has(app)} onClick={() => setExpandedApps(current => { const next = new Set(current); if (next.has(app)) next.delete(app); else next.add(app); return next; })} />
        </div>
        {expandedApps.has(app) && items.map(({ site, path }) => <div key={site.id} className="space-y-1 border-l-2 border-border pl-3">
          <div className="flex items-center gap-2"><p className="text-xs text-muted-foreground">{path}</p>
            {orders[site.id] && <Button variant="ghost" size="compactIcon" aria-label="Restaurar ordem original" title="Restaurar ordem original" onClick={() => { const { [site.id]: _, ...rest } = orders; setDraft(rest); }}><RotateCcw /></Button>}
          </div>
          <TableRowEditor site={site} order={orderOf(site)} onChange={(o) => setDraft({ ...orders, [site.id]: o })} names={names} onRename={(i, name) => rename(site, i, name)} editingKey={editingKey} onEditing={setEditingKey} canRename={!!isAdmin} />
        </div>)}
      </div>)}
      <p className="text-xs text-muted-foreground">Colunas marcadas como condicionais só aparecem em certas situações; a ordem é mantida quando surgem.</p>
    </CdeSection>}
  </section>;
}
