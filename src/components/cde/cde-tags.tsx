import { CdeSection } from "./cde-section";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { CdeCategoryHeader } from "./cde-category-header";
import { CdeButton, useCdeSwatchStyle } from "./cde-button";
import inventory from "./tag-inventory.json";
import { TAG_LOCATIONS } from "./tag-locations";
import { TAG_COLOR_CHOICES, TAG_STYLE_GROUP, refreshTagStyles, tagColor, tagKey, useTagConfig, type TagConfig, type TagLook, type TagPart } from "./tag-style";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SelectValue } from "@/components/ui/select";

type Inv = { label: string; variant: string; className: string; apps: string[]; files: string[]; custom?: boolean };
const PARTS: [TagPart, string][] = [["bg", "Fundo"], ["text", "Texto"], ["border", "Borda"]];

export function ColorSelect({ value, inheritedColor, label, onChange }: { value?: string; inheritedColor?: { key: string; label: string; value: string }; label: string; onChange: (v: string) => void }) {
  const swatch = useCdeSwatchStyle();
  const dot = (o: { key: string; value: string }) => <span aria-hidden="true" style={{ background: o.value, ...swatch.css }} className={cn("block h-4 w-4 shrink-0 rounded-full border border-border", swatch.cls)} />;
  const chosen = tagColor(value);
  const cur = chosen.key === "padrao" ? inheritedColor : chosen;
  const options = TAG_COLOR_CHOICES.filter(o => o.key !== inheritedColor?.key);
  if (inheritedColor) options.unshift(inheritedColor);
  return <Select value={cur?.key ?? ""} onValueChange={v => onChange(v === inheritedColor?.key ? "padrao" : v)}><SelectTrigger className="h-8 w-36 text-xs" aria-label={label} title={cur?.label}><div className="flex min-w-0 items-center gap-2">{cur && dot(cur)}<span className="truncate text-xs">{cur?.label ?? "Escolha uma cor"}</span></div></SelectTrigger>
    <SelectContent>{options.map((o) => <SelectItem key={o.key} value={o.key}><span className="inline-flex items-center gap-2 text-xs">{dot(o)}<span>{o.label}</span></span></SelectItem>)}</SelectContent></Select>;
}

/** CDE item Tags: every tag in use, each with independent background/text/border. */
export function CdeTags({ number, handle }: { number: number; handle?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [contentOpen, setContentOpen] = useState(true);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const saved = useTagConfig();
  const [draft, setDraft] = useState<TagConfig | null>(null);
  const cfg = draft ?? saved;
  const [renaming, setRenaming] = useState<string | null>(null); const [nameVal, setNameVal] = useState("");
  const [novo, setNovo] = useState("");
  const [removing, setRemoving] = useState<Inv | null>(null); const [target, setTarget] = useState(""); const [targetNew, setTargetNew] = useState("");
  const statuses = useQuery({ queryKey: ["cde-tag-supply-statuses"], enabled: open, queryFn: async () => (await supabase.from("supply_order_statuses").select("label").eq("active", true)).data ?? [] });
  const all = useMemo(() => {
    const m = new Map<string, Inv>();
    for (const t of inventory as Inv[]) m.set(tagKey(t.label), t);
    for (const s of statuses.data ?? []) if (s.label && !m.has(tagKey(s.label))) m.set(tagKey(s.label), { label: s.label, variant: "status", className: "", apps: ["Supply"], files: [] });
    for (const c of cfg.custom) if (!m.has(tagKey(c))) m.set(tagKey(c), { label: c, variant: "outline", className: "", apps: [], files: [], custom: true });
    return [...m.values()];
  }, [statuses.data, cfg.custom]);
  const nameOf = (t: Inv) => cfg.renames[tagKey(t.label)] ?? t.label;
  const rows = all.filter((t) => !cfg.removed[tagKey(t.label)]).sort((a, b) => nameOf(a).localeCompare(nameOf(b), "pt-BR"));
  const removedRows = all.filter((t) => cfg.removed[tagKey(t.label)]);
  const where = (t: Inv) => { const seen = new Set<string>(); const apps: string[] = []; const menus: string[] = []; for (const f of t.files) { const l = TAG_LOCATIONS[f]; if (!l) continue; if (!apps.includes(l.app)) apps.push(l.app); const m = `${l.app}: ${l.menu}`; if (!seen.has(m)) { seen.add(m); menus.push(m); } } const via = removedRows.filter((r) => tagKey(cfg.removed[tagKey(r.label)]) === tagKey(t.label)).map((r) => `Substitui “${r.label}”`); return { apps: apps.length ? apps : t.custom ? ["Criada no CDE"] : t.apps, menus: [...(menus.length ? menus : t.custom ? [] : t.apps.map((a) => `${a}: situações`)), ...via] }; };
  const shown = rows.filter((r) => !q.trim() || tagKey(nameOf(r)).includes(tagKey(q)) || tagKey(r.label).includes(tagKey(q)) || [...where(r).apps, ...where(r).menus].some((a) => tagKey(a).includes(tagKey(q))));
  const exists = (name: string) => all.some((t) => !cfg.removed[tagKey(t.label)] && (tagKey(t.label) === tagKey(name) || tagKey(nameOf(t)) === tagKey(name)));
  const set = (label: string, part: TagPart, v: string) => {
    const k = tagKey(label); const look: TagLook = { ...(cfg.looks[k] ?? {}) };
    if (v === "padrao") delete look[part]; else look[part] = v;
    const looks = { ...cfg.looks }; if (Object.keys(look).length) looks[k] = look; else delete looks[k];
    setDraft({ ...cfg, looks });
  };
  const rename = (t: Inv) => {
    const v = nameVal.trim().replace(/\s+/g, " "); const k = tagKey(t.label); const renames = { ...cfg.renames };
    if (!v) return toast.error("Informe o nome da tag.");
    if (tagKey(v) !== tagKey(nameOf(t)) && exists(v)) return toast.error("Já existe uma tag com esse nome.");
    if (v === t.label) delete renames[k]; else renames[k] = v;
    setDraft({ ...cfg, renames }); setRenaming(null);
  };
  const create = () => {
    const v = novo.trim().replace(/\s+/g, " ");
    if (!v) return; if (exists(v)) return toast.error("Já existe uma tag com esse nome.");
    setDraft({ ...cfg, custom: [...cfg.custom, v] }); setNovo("");
  };
  const confirmRemove = () => {
    if (!removing) return;
    let dest = target; const custom = [...cfg.custom];
    if (target === "__nova") { const v = targetNew.trim().replace(/\s+/g, " "); if (!v) return toast.error("Informe o nome da nova tag."); if (exists(v)) return toast.error("Essa tag já existe: escolha-a na lista."); custom.push(v); dest = v; }
    if (!dest) return toast.error("Escolha a tag que vai substituir a excluída.");
    const k = tagKey(removing.label);
    const removed = { ...cfg.removed, [k]: dest };
    for (const [rk, rv] of Object.entries(removed)) if (tagKey(rv) === k) removed[rk] = dest; // re-point tags that pointed here
    setDraft({ ...cfg, custom: removing.custom ? custom.filter((c) => tagKey(c) !== k) : custom, removed }); setRemoving(null);
  };
  const restore = (t: Inv) => { const removed = { ...cfg.removed }; delete removed[tagKey(t.label)]; setDraft({ ...cfg, removed }); };
  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão não encontrada");
      const existing = await supabase.from("cde_selected").select("variant_key").eq("group_key", TAG_STYLE_GROUP).eq("is_primary", true).maybeSingle();
      if (existing.error) throw existing.error;
      const row = { variant_key: JSON.stringify(draft), chosen_by: user.id };
      const r = existing.data ? await supabase.from("cde_selected").update(row).eq("group_key", TAG_STYLE_GROUP).eq("variant_key", existing.data.variant_key).select("group_key") : await supabase.from("cde_selected").insert({ ...row, group_key: TAG_STYLE_GROUP }).select("group_key");
      if (r.error || !r.data?.length) throw r.error ?? new Error("sem permissão");
      await refreshTagStyles(); setDraft(null); toast.success("Tags atualizadas em todos os apps");
    } catch { toast.error("Não foi possível salvar as tags. Somente Admin do ERP altera o CDE."); } finally { setSaving(false); }
  }
  const variantOf = (t: Inv) => (["default", "secondary", "destructive", "outline", "status"].includes(t.variant) ? t.variant : "default") as "default";
  return <section className="cde-category-sections">
    <CdeCategoryHeader handle={handle} number={number} title="Tags" hint="Nome, fundo, texto e borda de cada etiqueta usada nos apps" open={open} onToggle={() => setOpen(!open)} />
    {open && <CdeSection title="Etiquetas dos apps" open={contentOpen} actions={<><Button variant="ghost" size="icon" aria-label="Salvar" title="Salvar tags" onClick={save} disabled={saving || !draft || JSON.stringify(draft) === JSON.stringify(saved)}><Save /></Button><Button variant="ghost" size="icon" aria-label="Cancelar" title="Cancelar" onClick={() => setDraft(null)}><X /></Button><CdeButton group="toggle" screen="components/cde/cde-tags.tsx" aria-label={`${contentOpen ? "Recolher" : "Exibir"} etiquetas dos apps`} title={`${contentOpen ? "Recolher" : "Exibir"} etiquetas dos apps`} aria-expanded={contentOpen} onClick={() => setContentOpen(!contentOpen)} /></>}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{rows.length} tags. Renomear muda só o nome exibido; os registros continuam os mesmos.</p>
        <div className="flex items-center gap-1">
          {draft && <></>}
          <Input aria-label="Buscar tag" placeholder="Buscar tag ou app" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 w-56 text-[length:var(--filter-fs)] md:text-[length:var(--filter-fs)]" />
        </div>
      </div>
      <div className="flex max-w-md items-end gap-2"><Input aria-label="Nova tag" placeholder="Nome da nova tag" value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") create(); }} /><Button variant="ghost" onClick={create}><Plus className="h-4 w-4" />Nova tag</Button></div>
      <Table><TableHeader><TableRow><TableHead>Tag</TableHead><TableHead>Apps</TableHead><TableHead>Menus e submenus</TableHead>{PARTS.map(([, l]) => <TableHead key={l}>{l}</TableHead>)}<TableHead>Ações</TableHead></TableRow></TableHeader>
        <TableBody>{shown.map((t) => { const k = tagKey(t.label); const look = cfg.looks[k]; const renamed = cfg.renames[k]; return <TableRow key={k}>
          <TableCell>{renaming === k ? <Input aria-label="Nome da tag" autoFocus className="h-8 w-48" value={nameVal} onChange={(e) => setNameVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") rename(t); if (e.key === "Escape") setRenaming(null); }} onBlur={() => rename(t)} />
            : <span className="inline-flex flex-col items-start gap-0.5"><Badge variant={variantOf(t)} className={t.className} cdeLook={look ?? {}}>{nameOf(t)}</Badge>{renamed && <span className="text-[10px] text-muted-foreground">Original: {t.label}</span>}</span>}</TableCell>
          <TableCell className="text-xs text-muted-foreground">{where(t).apps.join(", ")}</TableCell><TableCell className="text-xs text-muted-foreground">{where(t).menus.map((m) => <div key={m}>{m}</div>)}</TableCell>
          {PARTS.map(([p, l]) => <TableCell key={p}><ColorSelect label={`${l} de ${t.label}`} value={look?.[p]} onChange={(v) => set(t.label, p, v)} /></TableCell>)}
          <TableCell className="whitespace-nowrap"><Button variant="ghost" size="icon" aria-label="Renomear tag" title="Renomear tag" onClick={() => { setRenaming(k); setNameVal(nameOf(t)); }}><Pencil /></Button>
            <Button variant="ghost" size="icon" aria-label="Excluir tag" title="Excluir tag" onClick={() => { setRemoving(t); setTarget(""); setTargetNew(""); }}><Trash2 /></Button></TableCell>
        </TableRow>; })}
          {!shown.length && <TableRow><TableCell colSpan={7} className="text-muted-foreground">Nenhuma tag.</TableCell></TableRow>}</TableBody></Table>
      {removedRows.length > 0 && <div className="space-y-1"><p className="text-sm font-medium">Tags excluídas ({removedRows.length})</p>
        <ul className="space-y-1">{removedRows.map((t) => <li key={t.label} className="flex flex-wrap items-center gap-2 text-sm"><span className="text-muted-foreground line-through">{t.label}</span><span className="text-xs text-muted-foreground">→ exibida como “{cfg.renames[tagKey(cfg.removed[tagKey(t.label)])] ?? cfg.removed[tagKey(t.label)]}”</span><Button variant="ghost" size="icon" aria-label="Restaurar tag" title="Restaurar tag" onClick={() => restore(t)}><RotateCcw /></Button></li>)}</ul></div>}
    </CdeSection>}
    <Dialog open={!!removing} onOpenChange={(o) => { if (!o) setRemoving(null); }}><DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle>Excluir a tag “{removing ? nameOf(removing) : ""}”</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">Onde ela aparece, passa a ser exibida a tag escolhida abaixo, com o nome e as cores dela. Os registros não são alterados e a exclusão pode ser desfeita.</p>
      <div className="space-y-1"><Label>Substituir por</Label><Select value={target} onValueChange={setTarget}><SelectTrigger aria-label="Substituir por"><SelectValue placeholder="Escolha a tag" /></SelectTrigger>
        <SelectContent><SelectItem value="__nova">+ Criar nova tag</SelectItem>{rows.filter((t) => t !== removing).map((t) => <SelectItem key={t.label} value={t.label}>{nameOf(t)}</SelectItem>)}</SelectContent></Select></div>
      {target === "__nova" && <div className="space-y-1"><Label htmlFor="tag-nova-dest">Nome da nova tag</Label><Input id="tag-nova-dest" value={targetNew} onChange={(e) => setTargetNew(e.target.value)} /></div>}
      <div className="flex gap-2 pt-2"><Button variant="ghost" onClick={confirmRemove}><Trash2 className="h-4 w-4" />Excluir e substituir</Button></div>
      <p className="text-xs text-muted-foreground">A exclusão só vale nos apps depois de salvar no disquete.</p>
    </DialogContent></Dialog>
  </section>;
}
