import { useState, type ReactNode } from "react";
import { ArrowUpDown, MapPin, Pencil, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { confirmAction } from "@/components/confirm-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTableFilters } from "@/components/use-table-filters";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CdeCategoryHeader } from "./cde-category-header";
import { CdeButton, useCdeStandards, type CdeGroup } from "./cde-button";
import { canRetireLibraryEntry, libraryEntryKey, readRetiredEntries } from "./library-retirement";
import { ICONS } from "./cde-render";
import { detectButtonGroup, readButtonBindings, type AutoGroup } from "./cde-look";
import library from "./button-library.json";
import { isSpecificAction } from "./action-standard";

const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export type LibraryButton = (typeof library)[number];
export function CdeButtonLibrary({ number, handle, onEdit }: { number: number; handle?: ReactNode; onEdit: (button: LibraryButton, group?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState("name");
  const [direction, setDirection] = useState("asc");
  const [checked, setChecked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const { data } = useCdeStandards();
  const [editingButton, setEditingButton] = useState<LibraryButton | null>(null);
  const [editText, setEditText] = useState("");
  const [editGroup, setEditGroup] = useState("");
  const bindingRow = data?.selected.find(s => s.group_key === "button_bindings" && s.is_primary);
  const bindings = readButtonBindings(bindingRow?.variant_key);
  const retiredRow = data?.selected.find(s => s.group_key === "button_library_retired" && s.is_primary);
  const retired = readRetiredEntries(retiredRow?.variant_key);
  const visibleLibrary = library.filter(b => !retired.includes(libraryEntryKey(b)));
  const typeOf = (b: LibraryButton) => bindings[b.label]?.group || b.group || detectButtonGroup(<>{ICONS[b.icon] && (() => { const Icon = ICONS[b.icon]; return <Icon />; })()}{b.label}</>) || b.tag;
  const classification = (b: LibraryButton) => {
    const group = typeOf(b);
    const rows = data?.selected.filter(s => s.group_key === group) ?? [];
    const row = rows.find(s => !s.is_primary && s.screens.includes(b.file)) ?? rows.find(s => s.is_primary);
    const model = data?.models.find(m => `custom:${m.id}` === row?.variant_key);
    return isSpecificAction({ group, className: b.className, customStyle: b.visualCustom, secondary: row ? !row.is_primary : false, modelStyle: model?.style as import("./cde-render").CdeStyle }) ? "Função específica" : "Padrão visual comum";
  };
  const filters = useTableFilters(visibleLibrary, [
    { key: "name", label: "Nome do botão", value: b => b.label },
    { key: "type", label: "Tipo / grupo CDE", value: typeOf },
    { key: "file", label: "Local de uso", value: b => b.file },
    { key: "icon", label: "Ícone", value: b => b.icon },
    { key: "classification", label: "Classificação visual", value: classification },
  ]);
  const search = filters.searchText("name");
  const filtered = [...filters.filtered].sort((a, b) => {
    const value = (entry: LibraryButton) => sort === "type" ? typeOf(entry) : sort === "file" ? entry.file : entry.label;
    return (direction === "desc" ? -1 : 1) * value(a).localeCompare(value(b), "pt-BR", { sensitivity: "base", numeric: true });
  });
  const saveUses = filtered.filter(b => typeOf(b) === "save");
  const deleteUses = filtered.filter(b => typeOf(b) === "trash");
  const cards = filtered.filter(b => classification(b) === "Função específica" || ((typeOf(b) !== "save" || b === saveUses[0]) && (typeOf(b) !== "trash" || b === deleteUses[0])));
  const usesOf = (b: LibraryButton) => classification(b) === "Função específica" ? [b] : typeOf(b) === "save" ? saveUses.filter(b => classification(b) === "Padrão visual comum") : typeOf(b) === "trash" ? deleteUses.filter(b => classification(b) === "Padrão visual comum") : [b];
  function editCard(button: LibraryButton) {
    setEditingButton(button);
    setEditText(bindings[button.label]?.label || button.label);
    setEditGroup(bindings[button.label]?.group || button.group || detectButtonGroup(button.label) || "");
  }
  async function saveBinding() {
      if (!editingButton || !editGroup || !editText.trim()) return;
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão não encontrada");
      const next = { ...bindings, [editingButton.label]: { group: editGroup as AutoGroup, label: editText.trim() } };
      const payload = { variant_key: JSON.stringify(next), chosen_by: user.id };
      const result = bindingRow ? await supabase.from("cde_selected").update(payload).eq("group_key", "button_bindings").eq("variant_key", bindingRow.variant_key) : await supabase.from("cde_selected").insert({ ...payload, group_key: "button_bindings", is_primary: true });
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: ["cde-standards"] });
      setEditingButton(null);
      toast.success("Texto e padrão aplicados aos botões com esse nome.");
    } catch { toast.error("Não foi possível salvar o vínculo."); } finally { setSaving(false); }
  }
  async function removeCards(entries: LibraryButton[]) {
    const uses = entries.flatMap(usesOf);
    if (!uses.length) return;
    const blocked = uses.filter(b => !canRetireLibraryEntry(b, data?.selected ?? [], data?.models ?? []));
    if (blocked.length) {
      toast.error(`Retirada bloqueada: padrão não comprovado em ${blocked.length} uso(s).`, { description: blocked.slice(0, 3).map(b => `${b.file}:${b.line}`).join(" · ") });
      return;
    }
    if (!await confirmAction(`Padrão aplicado e vínculo validado nos ${uses.length} usos selecionados. Retirar os cards da biblioteca? Os botões continuarão nas telas com o padrão CDE.`, { title: "Confirmar retirada da biblioteca" })) return;
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão não encontrada");
      const payload = { variant_key: JSON.stringify([...new Set([...retired, ...uses.map(libraryEntryKey)])]), chosen_by: user.id };
      const result = retiredRow
        ? await supabase.from("cde_selected").update(payload).eq("group_key", "button_library_retired").eq("variant_key", retiredRow.variant_key)
        : await supabase.from("cde_selected").insert({ ...payload, group_key: "button_library_retired", is_primary: true });
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: ["cde-standards"] });
      setChecked([]);
      toast.success("Cards retirados; botões preservados nas telas.");
    } catch { toast.error("Não foi possível retirar os cards."); } finally { setSaving(false); }
  }
  return <section className="min-w-0 space-y-4">
    <CdeCategoryHeader number={number} handle={handle} title="Biblioteca de botões em uso" hint={`${library.length} usos`} open={open} onToggle={() => setOpen(!open)} />
    {open && <>
      <div className="flex items-center gap-2">
        <Checkbox aria-label="Selecionar todos os cards visíveis" checked={cards.length > 0 && cards.every(b => checked.includes(libraryEntryKey(b)))} onCheckedChange={value => setChecked(value ? cards.map(libraryEntryKey) : [])} />
        <Button type="button" variant="ghost" size="compactIcon" title="Excluir cards selecionados" aria-label="Excluir cards selecionados" disabled={saving || !checked.length} onClick={() => removeCards(cards.filter(b => checked.includes(libraryEntryKey(b))))}><Trash2 /></Button>
        {checked.length > 0 && <span className="text-xs text-muted-foreground">{checked.length} selecionados</span>}
      </div>
      <div className="flex items-center gap-2">{filters.menu}<Popover><PopoverTrigger asChild><Button type="button" variant="ghost" size="compactIcon" aria-label="Ordenar botões" title="Ordenar botões"><ArrowUpDown /></Button></PopoverTrigger><PopoverContent align="start" className="w-64 space-y-3"><Select value={sort} onValueChange={setSort}><SelectTrigger aria-label="Ordenar por"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="name">Nome do botão</SelectItem><SelectItem value="type">Tipo / grupo CDE</SelectItem><SelectItem value="file">Local de uso</SelectItem></SelectContent></Select><Select value={direction} onValueChange={setDirection}><SelectTrigger aria-label="Sentido da ordenação"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="asc">A → Z</SelectItem><SelectItem value="desc">Z → A</SelectItem></SelectContent></Select></PopoverContent></Popover></div>
      <p className="text-xs text-muted-foreground">{filtered.length} usos encontrados</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((b, index) => {
          const Icon = ICONS[b.icon];
          const options = b.label.split(" / ");
          const label = options.find(s => search.trim() && normalize(s).includes(normalize(search))) || options.find(s => !/\.\.\.|…/.test(s)) || options[0];
          const group = bindings[b.label]?.group || b.group || detectButtonGroup(<>{Icon && <Icon />}{label}</>);
          const uses = usesOf(b);
          const content = <>{Icon && <Icon className="h-4 w-4" />}{label}</>;
          const unique = visibleLibrary.filter(entry => entry.label === b.label).length === 1;
          const approvalsLink = unique && b.file === "routes/_authenticated/dashboard.tsx" && ["Agrupar por Projeto e Cliente", "Custo por Etiqueta", "Indicadores de prazos"].includes(b.label);
          return <article key={`${b.file}:${b.line}:${index}`} className="grid h-40 min-w-0 grid-cols-[minmax(0,1fr)_108px] grid-rows-[56px_minmax(0,1fr)_24px] items-center gap-x-2 gap-y-1 rounded-md border border-border bg-card p-3">
            <div className="relative col-span-2 min-w-0">
            {approvalsLink && <Link to="/dashboard" search={{ section: "queue", subsection: "all" }} aria-label={`Abrir página de ${label}`} title="Abrir Todos os approvals" className="absolute inset-0 z-10 rounded-md focus-visible:ring-2 focus-visible:ring-ring" />}
            {unique && b.file === "routes/_authenticated/chamados.tsx" && <Link to="/chamados" search={{ chamado: undefined }} aria-label={`Abrir página de ${label}`} className="absolute inset-0 z-10 rounded-md focus-visible:ring-2 focus-visible:ring-ring" />}
            {unique && b.file === "routes/_authenticated/development.tsx" && <Link to="/development" search={{ ticket: undefined }} aria-label={`Abrir página de ${label}`} className="absolute inset-0 z-10 rounded-md focus-visible:ring-2 focus-visible:ring-ring" />}
            <div className="relative isolate flex h-14 min-w-0 items-center overflow-x-auto overflow-y-hidden [contain:layout_paint] [&_button]:!static [&_button]:!m-0 [&_button]:shrink-0 [&_button]:!translate-x-0 [&_button]:!translate-y-0" inert>
              {b.tag === "CdeButton" && b.group ? <CdeButton group={b.group as CdeGroup} screen={b.file}>{label === b.icon ? null : label}</CdeButton> : b.tag === "button" ? <button type="button" className={b.className}>{content}</button> : <Button type="button" variant={(b.variant || undefined) as never} size={(b.size || undefined) as never} className={b.className}>{content}</Button>}
            </div>
            </div>
            <div className="min-w-0"><p className="truncate text-xs font-medium text-foreground" title={label}>{bindings[b.label]?.label || label}</p><p className="truncate text-xs text-muted-foreground" title={classification(b)}>{classification(b)}</p></div>
            <div className="grid grid-cols-3 items-center justify-items-center">
              <span className="flex h-9 w-9 items-center justify-center"><Checkbox aria-label={`Selecionar card ${b.label}`} checked={checked.includes(libraryEntryKey(b))} onCheckedChange={value => setChecked(prev => value ? [...new Set([...prev, libraryEntryKey(b)])] : prev.filter(k => k !== libraryEntryKey(b)))} /></span>
              <span className="flex h-9 w-9 items-center justify-center"><Button type="button" variant="ghost" size="compactIcon" title={`Editar ${label}`} aria-label={`Editar ${label}`} onClick={() => editCard(b)}><Pencil /></Button></span><span className="flex h-9 w-9 items-center justify-center"><Button type="button" variant="ghost" size="compactIcon" title="Excluir card da biblioteca" aria-label={`Excluir card ${b.label}`} disabled={saving} onClick={() => removeCards([b])}><Trash2 /></Button></span>
            </div>
            {group === "save" || group === "trash" ? <Popover><PopoverTrigger asChild><Button type="button" variant="ghost" size="sm" className="col-span-2 justify-start" aria-label={`Locais do botão ${group === "trash" ? "Excluir" : "Salvar"}`}><MapPin />{uses.length} locais de uso</Button></PopoverTrigger><PopoverContent className="max-h-80 w-96 max-w-[90vw] overflow-y-auto"><ul className="space-y-2">{uses.map((use, i) => <li key={`${use.file}:${use.line}:${i}`} className="break-words text-xs text-muted-foreground">{use.file}:{use.line} · {use.label}</li>)}</ul></PopoverContent></Popover> : <p className="col-span-2 truncate text-xs text-muted-foreground" title={`${b.label}\n${group ? `CDE: ${group}` : "Sem grupo de ação identificado"}\n${b.file}:${b.line}`}>{b.file.split("/").at(-1)}:{b.line} · {b.label}</p>}
          </article>;
        })}
      </div>
      {!filtered.length && <p className="text-sm text-muted-foreground">Nenhum botão encontrado.</p>}
    </>}
    <Dialog open={!!editingButton} onOpenChange={open => { if (!open) setEditingButton(null); }}><DialogContent><DialogHeader><DialogTitle>Editar texto e vinculação</DialogTitle></DialogHeader>
      <p className="break-words text-xs text-muted-foreground">{editingButton?.file}:{editingButton?.line}</p>
      <p className="text-sm text-muted-foreground">Aplica-se aos botões compartilhados com o mesmo nome original: {editingButton?.label}.</p>
      <Label htmlFor="library-button-text">Texto do botão</Label><Input id="library-button-text" value={editText} onChange={e => setEditText(e.target.value)} />
      <Label>Padrão vinculado</Label><Select value={editGroup} onValueChange={setEditGroup}><SelectTrigger aria-label="Padrão vinculado"><SelectValue placeholder="Escolher padrão" /></SelectTrigger><SelectContent>{[["save","Salvar"],["cancel","Cancelar"],["confirm","Confirmar / Concluir"],["trash","Excluir"],["send","Enviar"],["attach","Anexar"],["export","Exportar"],["clear","Limpar"],["organize","Organizar"]].map(([key, label]) => <SelectItem key={key} value={key} disabled={!data?.selected.some(s => s.group_key === key && s.is_primary)}>{label}</SelectItem>)}</SelectContent></Select>
      {editingButton && (editingButton.tag !== "Button" || !editingButton.autoCdeSafe) && <p className="text-sm text-destructive">Este uso exige integração na tela antes de permitir salvar texto e vínculo.</p>}
      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => { if (editingButton) { onEdit(editingButton, editGroup); setEditingButton(null); } }}>Editar aparência do padrão</Button><Button disabled={saving || !editText.trim() || !editGroup || editingButton?.tag !== "Button" || !editingButton?.autoCdeSafe} onClick={saveBinding}>Salvar</Button></div>
    </DialogContent></Dialog>
  </section>;
}