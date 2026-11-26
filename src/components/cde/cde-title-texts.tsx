import { CdeSection } from "./cde-section";
import { CdeButton } from "./cde-button";
import { useState } from "react";
import { Pencil, RotateCcw, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { CdeCategoryHeader } from "./cde-category-header";
import inventory from "./title-inventory.json";
import { TAG_LOCATIONS } from "./tag-locations";
import { TITLE_TEXT_GROUP, refreshTitleTexts, titleKey, useTitleTexts, type TitleKind, type TitleTexts } from "./title-text";

type Inv = { kind: TitleKind; text: string; files: string[] };
const where = (files: string[]) => [...new Set(files.map((f) => { const l = TAG_LOCATIONS[f]; return l ? `${l.app}: ${l.menu}` : f.replace(/^.*\//, "").replace(/\.tsx$/, ""); }))];

/** CDE item Títulos e Subtítulos: every static card title/subtitle, with its text editable; empty restores the original. */
export function CdeTitleTexts({ number, handle }: { number: number; handle?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [contentOpen, setContentOpen] = useState(true);
  const [q, setQ] = useState(""); const [kind, setKind] = useState<"all" | TitleKind>("all");
  const saved = useTitleTexts();
  const [editing, setEditing] = useState<string | null>(null); const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const rows = (inventory as Inv[]).filter((r) => (kind === "all" || r.kind === kind) && (!q.trim() || [r.text, saved[titleKey(r.kind, r.text)] ?? "", ...where(r.files)].some((x) => x.toLowerCase().includes(q.trim().toLowerCase()))));
  async function persist(next: TitleTexts, msg: string) {
    setBusy(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão não encontrada");
      const existing = await supabase.from("cde_selected").select("variant_key").eq("group_key", TITLE_TEXT_GROUP).eq("is_primary", true).maybeSingle();
      if (existing.error) throw existing.error;
      const row = { variant_key: JSON.stringify(next), chosen_by: user.id };
      const r = existing.data ? await supabase.from("cde_selected").update(row).eq("group_key", TITLE_TEXT_GROUP).eq("variant_key", existing.data.variant_key).select("group_key") : await supabase.from("cde_selected").insert({ ...row, group_key: TITLE_TEXT_GROUP }).select("group_key");
      if (r.error || !r.data?.length) throw r.error ?? new Error("sem permissão");
      await refreshTitleTexts(); setEditing(null); toast.success(msg);
    } catch { toast.error("Não foi possível salvar o texto."); } finally { setBusy(false); }
  }
  const save = (r: Inv) => { const k = titleKey(r.kind, r.text); const next = { ...saved }; const v = value.trim().replace(/\s+/g, " "); if (!v || v === r.text) delete next[k]; else next[k] = v; void persist(next, "Texto atualizado em todos os apps"); };
  const restore = (r: Inv) => { const next = { ...saved }; delete next[titleKey(r.kind, r.text)]; void persist(next, "Texto original restaurado"); };
  return <section className="cde-category-sections">
    <CdeCategoryHeader handle={handle} number={number} title="Títulos e Subtítulos" hint="Textos dos títulos e subtítulos das telas, editáveis em todos os apps" open={open} onToggle={() => setOpen(!open)} />
    {open && <CdeSection title="Textos dos apps" open={contentOpen} actions={<><Button variant="ghost" size="icon" aria-label="Salvar texto" title="Salvar texto" disabled={busy || !editing || value === (saved[editing] ?? rows.find(r => titleKey(r.kind, r.text) === editing)?.text ?? "")} onClick={() => { const row = rows.find(r => titleKey(r.kind, r.text) === editing); if (row) save(row); }}><Save /></Button><Button variant="ghost" size="icon" aria-label="Cancelar texto" title="Cancelar" onClick={() => setEditing(null)}><X /></Button><CdeButton group="toggle" screen="components/cde/cde-title-texts.tsx" aria-label={`${contentOpen ? "Recolher" : "Exibir"} textos dos apps`} title={`${contentOpen ? "Recolher" : "Exibir"} textos dos apps`} aria-expanded={contentOpen} onClick={() => setContentOpen(!contentOpen)} /></>}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{inventory.length} textos. As cores ficam em Cabeçalhos e Listas. O mesmo texto original muda junto em todas as telas onde aparece.</p>
        <div className="flex items-center gap-2">
          <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}><SelectTrigger aria-label="Tipo" className="h-8 w-36 text-[length:var(--filter-fs)]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="titulo">Títulos</SelectItem><SelectItem value="subtitulo">Subtítulos</SelectItem></SelectContent></Select>
          <Input aria-label="Buscar título" placeholder="Buscar texto ou app" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 w-56 text-[length:var(--filter-fs)] md:text-[length:var(--filter-fs)]" />
        </div>
      </div>
      <Table><TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Texto exibido</TableHead><TableHead>Original</TableHead><TableHead>Apps, menus e submenus</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
        <TableBody>{rows.map((r) => { const k = titleKey(r.kind, r.text); const cur = saved[k]; return <TableRow key={k}>
          <TableCell className="text-xs text-muted-foreground">{r.kind === "titulo" ? "Título" : "Subtítulo"}</TableCell>
          <TableCell className={r.kind === "titulo" ? "font-semibold" : "text-sm"}>{editing === k ? <Input aria-label="Novo texto" autoFocus value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(r); if (e.key === "Escape") setEditing(null); }} /> : cur ?? r.text}</TableCell>
          <TableCell className="text-xs text-muted-foreground">{cur ? r.text : "—"}</TableCell>
          <TableCell className="text-xs text-muted-foreground">{where(r.files).map((w) => <div key={w}>{w}</div>)}</TableCell>
          <TableCell className="whitespace-nowrap"><Button variant="ghost" size="icon" aria-label="Editar texto" title="Editar texto" onClick={() => { setEditing(k); setValue(cur ?? r.text); }}><Pencil /></Button>{cur && <Button variant="ghost" size="icon" aria-label="Restaurar original" title="Restaurar original" disabled={busy} onClick={() => restore(r)}><RotateCcw /></Button>}</TableCell>
        </TableRow>; })}
          {!rows.length && <TableRow><TableCell colSpan={5} className="text-muted-foreground">Nenhum texto.</TableCell></TableRow>}</TableBody></Table>
    </CdeSection>}
  </section>;
}
