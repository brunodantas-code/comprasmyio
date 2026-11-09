import { useState, type ReactNode } from "react";
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react";
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
import { CdeButton, CdeNumber, useCdeStandards, type CdeGroup } from "./cde-button";
import { canRetireLibraryEntry, libraryEntryKey, readRetiredEntries } from "./library-retirement";
import { ICONS } from "./cde-render";
import { detectButtonGroup, readButtonBindings } from "./cde-look";
import library from "./button-library.json";
import { isSpecificAction } from "./action-standard";
import { UsageLinks } from "./usage-links";
import { libraryDescription } from "./library-details";
import { consolidateLibrary, libraryModelKey } from "./library-models";

const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export type LibraryButton = (typeof library)[number];
export function CdeButtonLibrary({ number, handle, onEdit }: { number: number; handle?: ReactNode; onEdit: (button: LibraryButton, group?: string, ids?: string[], modelKey?: string) => void }) {
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
  const [editModel, setEditModel] = useState("");
  const [scope, setScope] = useState("one");
  const [replacing, setReplacing] = useState<LibraryButton[]>([]);
  const [replacementKey, setReplacementKey] = useState("");
  const bindingRow = data?.selected.find(s => s.group_key === "button_bindings" && s.is_primary);
  const bindings = readButtonBindings(bindingRow?.variant_key);
  const retiredRow = data?.selected.find(s => s.group_key === "button_library_retired" && s.is_primary);
  const retired = readRetiredEntries(retiredRow?.variant_key);
  const visibleLibrary = library;
  const bindingOf = (b: LibraryButton) => bindings[b.id] ?? bindings[b.label];
  const typeOf = (b: LibraryButton) => bindingOf(b)?.group || b.group || detectButtonGroup(<>{ICONS[b.icon] && (() => { const Icon = ICONS[b.icon]; return <Icon />; })()}{b.label}</>) || "action_standard";
  const classification = (b: LibraryButton) => {
    const group = typeOf(b);
    const rows = data?.selected.filter(s => s.group_key === group) ?? [];
    const row = rows.find(s => !s.is_primary && s.screens.includes(b.file)) ?? rows.find(s => s.is_primary);
    const model = data?.models.find(m => `custom:${m.id}` === (bindingOf(b)?.modelKey ?? row?.variant_key));
    return isSpecificAction({ group, className: b.className, customStyle: b.visualCustom, secondary: row ? !row.is_primary : false, modelStyle: model?.style as import("./cde-render").CdeStyle }) ? "Função específica" : "Padrão visual comum";
  };
  const modelIdentity = (b: LibraryButton) => {
    const group = typeOf(b);
    const rows = data?.selected.filter(s => s.group_key === group) ?? [];
    const row = rows.find(s => !s.is_primary && s.screens.includes(b.file)) ?? rows.find(s => s.is_primary);
    return libraryModelKey(b, { group, model: bindingOf(b)?.modelKey ?? row?.variant_key ?? "source", label: bindingOf(b)?.label, preserveContent: bindingOf(b)?.preserveContent, bound: Boolean(bindingOf(b)) });
  };
  const models = consolidateLibrary(visibleLibrary, modelIdentity);
  const usesOf = (b: LibraryButton) => models.find(m => m.key === modelIdentity(b))?.uses ?? [b];
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
  const matched = new Set(filtered.map(b => b.id));
  const cards = models.filter(m => m.uses.some(b => matched.has(b.id))).map(m => m.representative).sort((a, b) => filtered.findIndex(s => s.id === a.id) - filtered.findIndex(s => s.id === b.id));
  const scopeEntries = (button: LibraryButton) => scope === "checked" ? visibleLibrary.filter(b => checked.includes(libraryEntryKey(b))) : scope === "same" ? visibleLibrary.filter(b => b.label === button.label && typeOf(b) === typeOf(button)) : usesOf(button);
  function editCard(button: LibraryButton) {
    setEditingButton(button);
    setEditText(bindingOf(button)?.label ?? (button.dynamic ? "" : button.label === button.icon ? "" : button.label));
    setEditGroup(typeOf(button));
    setEditModel(bindingOf(button)?.modelKey ?? "");
    setScope("one");
  }
  async function saveBinding() {
      if (!editingButton || !editGroup) return;
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão não encontrada");
      const next = { ...bindings };
      for (const entry of scopeEntries(editingButton)) next[entry.id] = { group: editGroup, label: editText.trim(), preserveContent: entry.dynamic, ...(editModel ? { modelKey: editModel } : {}) };
      const payload = { variant_key: JSON.stringify(next), chosen_by: user.id };
      const result = bindingRow ? await supabase.from("cde_selected").update(payload).eq("group_key", "button_bindings").eq("variant_key", bindingRow.variant_key) : await supabase.from("cde_selected").insert({ ...payload, group_key: "button_bindings", is_primary: true });
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: ["cde-standards"] });
      await qc.invalidateQueries({ queryKey: ["cde-data"] });
      setEditingButton(null);
      toast.success("Modelo aplicado aos usos escolhidos.");
    } catch { toast.error("Não foi possível salvar o vínculo."); } finally { setSaving(false); }
  }
  async function removeCards(entries: LibraryButton[]) {
    const uses = [...new Map(entries.flatMap(usesOf).map(b => [b.id, b])).values()];
    if (!uses.length) return;
    setReplacementKey("");
    setReplacing(uses);
  }
  async function replaceAndRetire() {
    if (!replacementKey || !replacing.length) return;
    const chosen = data?.models.find(m => `custom:${m.id}` === replacementKey);
    if (!chosen) return;
    if (!await confirmAction(`Substituir a aparência de ${replacing.length} uso(s) por ${chosen.name}? Os usos permanecem na biblioteca, consolidados por modelo, e as funções continuam nas telas.`, { title: "Confirmar substituição" })) return;
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão não encontrada");
      const next = { ...bindings };
      for (const entry of replacing) next[entry.id] = { group: chosen.group_key, modelKey: replacementKey, label: bindingOf(entry)?.label ?? (entry.label === entry.icon ? "" : entry.label), preserveContent: entry.dynamic };
      const boundPayload = { variant_key: JSON.stringify(next), chosen_by: user.id };
      const bound = bindingRow ? await supabase.from("cde_selected").update(boundPayload).eq("group_key", "button_bindings").eq("variant_key", bindingRow.variant_key) : await supabase.from("cde_selected").insert({ ...boundPayload, group_key: "button_bindings", is_primary: true });
      if (bound.error) throw bound.error;
      const proof = [...(data?.selected ?? []).filter(s => s.group_key !== "button_bindings"), { group_key: "button_bindings", variant_key: JSON.stringify(next), is_primary: true, screens: [] }];
      if (replacing.some(entry => !canRetireLibraryEntry(entry, proof, data?.models ?? []))) throw new Error("Vínculo inválido");
      const replacedIds = new Set(replacing.map(libraryEntryKey));
      const payload = { variant_key: JSON.stringify(retired.filter(id => !replacedIds.has(id))), chosen_by: user.id };
      const result = retiredRow
        ? await supabase.from("cde_selected").update(payload).eq("group_key", "button_library_retired").eq("variant_key", retiredRow.variant_key)
        : await supabase.from("cde_selected").insert({ ...payload, group_key: "button_library_retired", is_primary: true });
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: ["cde-standards"] });
      await qc.invalidateQueries({ queryKey: ["cde-data"] });
      setChecked([]);
      setReplacing([]);
      toast.success("Modelos substituídos; usos consolidados e preservados.");
    } catch { toast.error("Não foi possível retirar os cards."); } finally { setSaving(false); }
  }
  return <section className="min-w-0 space-y-4">
    <CdeCategoryHeader number={number} handle={handle} title="Biblioteca de botões em uso" hint={`${models.length} modelos · ${library.length} usos`} open={open} onToggle={() => setOpen(!open)} />
    {open && <>
      <div className="flex items-center gap-2">
        <Checkbox aria-label="Selecionar todos os cards visíveis" checked={cards.length > 0 && cards.flatMap(usesOf).every(b => checked.includes(libraryEntryKey(b)))} onCheckedChange={value => setChecked(value ? cards.flatMap(usesOf).map(libraryEntryKey) : [])} />
        <Button type="button" variant="ghost" size="compactIcon" title="Excluir cards selecionados" aria-label="Excluir cards selecionados" disabled={saving || !checked.length} onClick={() => removeCards(cards.filter(b => checked.includes(libraryEntryKey(b))))}><Trash2 /></Button>
        {checked.length > 0 && <span className="text-xs text-muted-foreground">{checked.length} selecionados</span>}
      </div>
      <div className="flex items-center gap-2">{filters.menu}<Popover><PopoverTrigger asChild><Button type="button" variant="ghost" size="compactIcon" aria-label="Ordenar botões" title="Ordenar botões"><ArrowUpDown /></Button></PopoverTrigger><PopoverContent align="start" className="w-64 space-y-3"><Select value={sort} onValueChange={setSort}><SelectTrigger aria-label="Ordenar por"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="name">Nome do botão</SelectItem><SelectItem value="type">Tipo / grupo CDE</SelectItem><SelectItem value="file">Local de uso</SelectItem></SelectContent></Select><Select value={direction} onValueChange={setDirection}><SelectTrigger aria-label="Sentido da ordenação"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="asc">A → Z</SelectItem><SelectItem value="desc">Z → A</SelectItem></SelectContent></Select></PopoverContent></Popover></div>
      <p className="text-xs text-muted-foreground">{cards.length} modelos encontrados · {cards.flatMap(usesOf).length} usos</p>
      {([["common", "Botões de ação padrão", "Salvar, Cancelar, Excluir, Adicionar e demais ações que seguem o padrão visual comum"], ["specific", "Botões de funções específicas", "Botões com altura, borda, fundo ou modelo próprios"]] as const).map(([kind, title, hint], sectionIndex) => {
        const sectionCards = cards.filter(b => (classification(b) === "Função específica") === (kind === "specific"));
        return <section key={kind} className="min-w-0 space-y-2">
          <div className="flex items-center gap-3 bg-accent px-5 py-2"><CdeNumber subcategory>{`${number}.${sectionIndex + 1}`}</CdeNumber><span className="min-w-0 flex-1"><span className="block text-sm font-normal">{title}</span><span className="block text-xs text-muted-foreground">{hint} · {sectionCards.length} modelos · {sectionCards.flatMap(usesOf).length} usos</span></span></div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {sectionCards.map((b, index) => {
          const Icon = ICONS[b.icon];
          const options = b.label.split(" / ");
          const label = options.find(s => search.trim() && normalize(s).includes(normalize(search))) || options.find(s => !/\.\.\.|…/.test(s)) || options[0];
          const group = typeOf(b);
          const description = libraryDescription(b, group);
          const uses = usesOf(b);
          const content = <>{Icon && <Icon className="h-4 w-4" />}{label}</>;
          const unique = visibleLibrary.filter(entry => entry.label === b.label).length === 1;
          const approvalsLink = unique && b.file === "routes/_authenticated/dashboard.tsx" && ["Agrupar por Projeto e Cliente", "Custo por Etiqueta", "Indicadores de prazos"].includes(b.label);
          return <article key={`${b.file}:${b.line}:${index}`} className="grid h-72 min-w-0 grid-cols-[minmax(0,1fr)_108px] grid-rows-[56px_48px_minmax(0,1fr)_72px] items-center gap-x-2 gap-y-1 rounded-md border border-border bg-card p-3">
            <div className="relative col-span-2 min-w-0">
            {approvalsLink && <Link to="/dashboard" search={{ section: "queue", subsection: "all" }} aria-label={`Abrir página de ${label}`} title="Abrir Todos os approvals" className="absolute inset-0 z-10 rounded-md focus-visible:ring-2 focus-visible:ring-ring" />}
            {unique && b.file === "routes/_authenticated/chamados.tsx" && <Link to="/chamados" search={{ chamado: undefined }} aria-label={`Abrir página de ${label}`} className="absolute inset-0 z-10 rounded-md focus-visible:ring-2 focus-visible:ring-ring" />}
            {unique && b.file === "routes/_authenticated/development.tsx" && <Link to="/development" search={{ ticket: undefined }} aria-label={`Abrir página de ${label}`} className="absolute inset-0 z-10 rounded-md focus-visible:ring-2 focus-visible:ring-ring" />}
            <div className="relative isolate flex h-14 min-w-0 items-center overflow-x-auto overflow-y-hidden [contain:layout_paint] [&_button]:!static [&_button]:!m-0 [&_button]:shrink-0 [&_button]:!translate-x-0 [&_button]:!translate-y-0" inert>
              {b.tag === "CdeButton" && b.group ? <CdeButton cdeId={b.id} group={b.group as CdeGroup} screen={b.file}>{label === b.icon ? null : label}</CdeButton> : <Button cdeId={b.id} cdeNative={b.tag === "button"} type="button" variant={(b.variant || undefined) as never} size={(b.size || undefined) as never} className={b.className}>{content}</Button>}
            </div>
            </div>
            <p className="col-span-2 line-clamp-3 text-xs text-muted-foreground" title={description}>{description}</p>
            <div className="min-w-0"><p className="truncate text-xs font-medium text-foreground" title={label}>{bindingOf(b)?.label || label}</p><p className="truncate text-xs text-muted-foreground" title={classification(b)}>{classification(b)}</p><p className="text-xs text-foreground" title="Locais no código, sem multiplicar pelas linhas exibidas na tela">{uses.length} uso{uses.length === 1 ? "" : "s"}</p></div>
            <div className="grid grid-cols-3 items-center justify-items-center">
              <span className="flex h-9 w-9 items-center justify-center"><Checkbox aria-label={`Selecionar card ${b.label}`} checked={uses.every(u => checked.includes(u.id))} onCheckedChange={value => setChecked(prev => value ? [...new Set([...prev, ...uses.map(u => u.id)])] : prev.filter(k => !uses.some(u => u.id === k)))} /></span>
              <span className="flex h-9 w-9 items-center justify-center"><Button type="button" variant="ghost" size="compactIcon" title={`Editar ${label}`} aria-label={`Editar ${label}`} onClick={() => editCard(b)}><Pencil /></Button></span><span className="flex h-9 w-9 items-center justify-center"><Button type="button" variant="ghost" size="compactIcon" title="Excluir card da biblioteca" aria-label={`Excluir card ${b.label}`} disabled={saving} onClick={() => removeCards([b])}><Trash2 /></Button></span>
            </div>
            <div className="col-span-2 h-full min-w-0 overflow-y-auto text-xs text-muted-foreground"><p className="mb-1">Onde é utilizado ({uses.length})</p>{uses.map((u, i) => <div key={u.id} className="mb-1 flex min-w-0 items-center gap-1"><b>{i + 1}.</b><span className="truncate" title={`${u.file}:${u.line}`}>{u.file.split("/").at(-1)}:{u.line}</span><UsageLinks file={u.file} siteId={u.id} /></div>)}</div>
          </article>;
        })}
      </div>
        </section>;
      })}
      {!filtered.length && <p className="text-sm text-muted-foreground">Nenhum botão encontrado.</p>}
    </>}
    <Dialog open={!!editingButton} onOpenChange={open => { if (!open) setEditingButton(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Editar botão e substituir modelo</DialogTitle></DialogHeader>
      <p className="break-words text-xs text-muted-foreground">{editingButton?.file}:{editingButton?.line}</p>
      <Label>Aplicar a</Label><Select value={scope} onValueChange={setScope}><SelectTrigger aria-label="Aplicar a"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="one">Todos os usos deste modelo ({editingButton ? usesOf(editingButton).length : 0})</SelectItem><SelectItem value="same">Mesmo nome e função em todos os apps</SelectItem><SelectItem value="checked" disabled={!checked.length}>Usos selecionados ({checked.length})</SelectItem></SelectContent></Select>
      <Label htmlFor="library-button-text">Texto alternativo (vazio = somente ícone)</Label><Input id="library-button-text" value={editText} disabled={editingButton?.dynamic} onChange={e => setEditText(e.target.value)} />
      {editingButton?.dynamic && <p className="text-xs text-muted-foreground">Conteúdo variável preservado.</p>}
      <Label>Padrão vinculado</Label><Select value={editGroup} onValueChange={v => { setEditGroup(v); setEditModel(""); }}><SelectTrigger aria-label="Padrão vinculado"><SelectValue placeholder="Escolher padrão" /></SelectTrigger><SelectContent>{[["action_standard","Padrão visual comum"],["plus","Adicionar (+)"],["add","Adicionar / Novo"],["save","Salvar"],["cancel","Cancelar"],["confirm","Confirmar / Concluir"],["trash","Excluir"],["pencil","Editar"],["toggle","Exibir / Recolher"],["move","Mover"],["sort","Ordenar"],["filter","Filtrar"],["close","X"],["send","Enviar"],["attach","Anexar"],["export","Exportar"],["clear","Limpar"],["organize","Organizar"]].map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select>
      <Label>Substituir por modelo</Label><Select value={editModel || "primary"} onValueChange={v => setEditModel(v === "primary" ? "" : v)}><SelectTrigger aria-label="Substituir por modelo"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="primary">Padrão principal do grupo</SelectItem>{data?.models.filter(m => ["Button", "button"].includes(m.tag)).map(m => <SelectItem key={m.id} value={`custom:${m.id}`}>{m.name || m.label || m.icon || "Modelo"}</SelectItem>)}</SelectContent></Select>
      <div className="flex flex-wrap justify-end gap-2"><Button variant="ghost" onClick={() => { if (editingButton) { onEdit(editingButton, editGroup, scopeEntries(editingButton).map(b => b.id), editModel); setEditingButton(null); } }}>Editar aparência</Button><Button disabled={saving || !editGroup || (!editModel && !data?.selected.some(s => s.group_key === editGroup && s.is_primary))} onClick={saveBinding}>Salvar substituição</Button></div>
    </DialogContent></Dialog>
    <Dialog open={replacing.length > 0} onOpenChange={open => { if (!open) setReplacing([]); }}><DialogContent><DialogHeader><DialogTitle>Substituir e consolidar modelos</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">{replacing.length} uso(s) selecionado(s)</p>
      <Label>Modelo substituto</Label><Select value={replacementKey} onValueChange={setReplacementKey}><SelectTrigger aria-label="Modelo substituto"><SelectValue placeholder="Escolher modelo" /></SelectTrigger><SelectContent>{data?.models.filter(m => ["Button", "button"].includes(m.tag)).map(m => <SelectItem key={m.id} value={`custom:${m.id}`}>{m.name}</SelectItem>)}</SelectContent></Select>
      <div className="flex justify-end"><Button disabled={saving || !replacementKey} onClick={replaceAndRetire}>Substituir e consolidar</Button></div>
    </DialogContent></Dialog>
  </section>;
}