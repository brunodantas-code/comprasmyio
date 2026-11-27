import { CdeSection } from "@/components/cde/cde-section";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Plus, Trash2, GripVertical } from "lucide-react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useCdeStandards } from "@/components/cde/cde-button";
import { CdeCategoryHeader } from "@/components/cde/cde-category-header";
import { configuredCategories, removeCategory, type CategorySetting } from "./rules";
import { confirmAction } from "@/components/confirm-dialog";
import { categoryIcons } from "./icons";

function SortableCategoryRow({ id, name, disabled, children }: { id: string; name: string; disabled: boolean; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id, disabled });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="flex items-start gap-2 py-2">
    <Button variant="ghost" size="icon" className="shrink-0 touch-none" title={`Arrastar ${name}`} aria-label={`Ordenar categoria ${name}`} disabled={disabled} {...attributes} {...(listeners ?? {})}><GripVertical /></Button>
    <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]">{children}</div>
  </div>;
}

export function SpendCategoryConfig({ number = 0, handle, standalone = false }: { number?: number; handle?: ReactNode; standalone?: boolean }) {
  const { data } = useCdeStandards();
  const qc = useQueryClient();
  const [open, setOpen] = useState(standalone);
  const [busy, setBusy] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const row = data?.selected.find(r => r.group_key === "spend_categories" && r.is_primary);
  const read = (): Record<string, CategorySetting> => { try { return JSON.parse(row?.variant_key ?? "{}"); } catch { return {}; } };
  const [draft, setDraft] = useState<Record<string, CategorySetting>>({});
  useEffect(() => { if (standalone) setDraft(read()); }, [standalone, row?.variant_key]);
  const lookups = useQuery({ queryKey: ["spend-category-lookups"], enabled: open, queryFn: async () => {
    const [a, c] = await Promise.all([supabase.from("cash_flow_accounts").select("id,code,name,active,accepts_entries,parent_id"), supabase.from("cost_centers").select("id,name").eq("active", true)]);
    if (a.error) throw a.error;
    if (c.error) throw c.error;
    return { accounts: a.data.filter(x => x.active && x.accepts_entries && !a.data.some(y => y.active && y.parent_id === x.id)).map(x => ({ value: x.id, label: `${x.code} · ${x.name}` })), centers: c.data.map(x => ({ value: x.id, label: x.name })) };
  } });
  function setting(key: string, name: string, icon: string): CategorySetting { return draft[key] ?? { name, icon, active: true, account_id: "", cost_center_id: "" }; }
  async function save() {
    setBusy(true);
    try {
      const u = (await supabase.auth.getUser()).data.user;
      if (!u) throw new Error("Sessão não encontrada");
      if (configuredCategories(draft, true).some(c => !c.name.trim())) throw new Error("Informe o nome de cada categoria");
      const value = JSON.stringify(draft);
      const r = row ? await supabase.from("cde_selected").update({ variant_key: value, chosen_by: u.id }).eq("group_key", "spend_categories").eq("is_primary", true).select("group_key").single() : await supabase.from("cde_selected").insert({ group_key: "spend_categories", variant_key: value, is_primary: true, chosen_by: u.id }).select("group_key").single();
      if (r.error) throw r.error;
      await Promise.all([qc.invalidateQueries({ queryKey: ["cde-standards"] }), qc.invalidateQueries({ queryKey: ["spend"] })]);
      toast.success("Categorias do Spend atualizadas");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar"); } finally { setBusy(false); }
  }
  const categoryRows = configuredCategories(draft, true);
  function moveCategory(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const from = categoryRows.findIndex(c => c.key === event.active.id);
    const to = categoryRows.findIndex(c => c.key === event.over?.id);
    if (from < 0 || to < 0) return;
    const ordered = arrayMove(categoryRows, from, to);
    setDraft(prev => {
      const next = { ...prev };
      ordered.forEach((cat, position) => {
        const current = prev[cat.key] ?? { name: cat.name, icon: cat.icon, active: true, account_id: "", cost_center_id: "" };
        next[cat.key] = { ...current, position };
      });
      return next;
    });
  }
  const saveButton = <Button variant="ghost" size="icon" title="Salvar categorias do Spend" aria-label="Salvar categorias do Spend" disabled={busy || JSON.stringify(draft) === JSON.stringify(read())} onClick={save}><Save /></Button>;
  return <section className="cde-category-sections">
    {!standalone && <CdeCategoryHeader number={number} {...(handle ? { handle } : {})} title="Spend — categorias de despesas" open={open} onToggle={() => { setDraft(read()); setOpen(!open); }} action={open ? saveButton : null} />}
    {open && <CdeSection className={standalone ? "[&>.cde-section-header]:!bg-muted/50 [&>.cde-section-header>.cde-header-actions]:!grid-cols-1 [&>.cde-section-header>.cde-header-actions>*]:!col-start-1" : undefined} title="Categorias de despesas" actions={standalone ? saveButton : null}>
      <Button variant="ghost" size="icon" title="Adicionar categoria" aria-label="Adicionar categoria do Spend" disabled={busy} onClick={() => { const key = `custom_${crypto.randomUUID()}`; setDraft(prev => ({ ...prev, [key]: { name: "", icon: "Ellipsis", active: true, account_id: "", cost_center_id: "" } })); }}><Plus /></Button>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={moveCategory}>
        <SortableContext items={categoryRows.map(c => c.key)} strategy={verticalListSortingStrategy}>
          <div className="divide-y divide-border">{categoryRows.map(cat => {
            const s = setting(cat.key, cat.name, cat.icon);
            const update = (change: Partial<CategorySetting>) => setDraft(prev => ({ ...prev, [cat.key]: { ...s, ...change } }));
            return <SortableCategoryRow key={cat.key} id={cat.key} name={s.name || cat.name} disabled={busy}>
              <label className="flex items-center gap-2 text-sm"><Switch checked={s.active} onCheckedChange={active => update({ active })} />{cat.name}</label>
              <Input aria-label={`Nome de ${cat.name}`} value={s.name} onChange={e => update({ name: e.target.value })} />
              <SearchableSelect aria-label={`Ícone de ${cat.name}`} value={s.icon} onChange={icon => update({ icon })} options={Object.keys(categoryIcons).map(k => ({ value: k, label: k }))} />
              <SearchableSelect aria-label={`Conta de ${cat.name}`} value={s.account_id} onChange={account_id => update({ account_id })} placeholder={cat.account} options={lookups.data?.accounts ?? []} />
              <SearchableSelect aria-label={`Centro de custo de ${cat.name}`} value={s.cost_center_id} onChange={cost_center_id => update({ cost_center_id })} placeholder="Centro de Custo padrão" options={lookups.data?.centers ?? []} />
              <Button variant="ghost" size="icon" title={`Excluir ${s.name}`} aria-label={`Excluir categoria ${s.name}`} disabled={busy} onClick={async () => { if (await confirmAction(`Excluir a categoria “${s.name}” das novas despesas? Os registros anteriores serão preservados.`)) setDraft(prev => removeCategory(prev, cat.key)); }}><Trash2 /></Button>
            </SortableCategoryRow>;
          })}</div>
        </SortableContext>
      </DndContext>
    </CdeSection>}
  </section>;
}
