import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { CdeCategoryHeader } from "./cde-category-header";
import { useCdeSwatchStyle } from "./cde-button";
import inventory from "./tag-inventory.json";
import { TAG_LOCATIONS } from "./tag-locations";
import { TAG_COLORS, TAG_STYLE_GROUP, refreshTagStyles, tagColor, tagKey, useTagStyles, type TagLook, type TagPart, type TagStyles } from "./tag-style";

type Inv = { label: string; variant: string; className: string; apps: string[]; files: string[] };
const PARTS: [TagPart, string][] = [["bg", "Fundo"], ["text", "Texto"], ["border", "Borda"]];

function ColorSelect({ value, label, onChange }: { value?: string; label: string; onChange: (v: string) => void }) {
  const swatch = useCdeSwatchStyle();
  const dot = (o: { key: string; value: string }) => <span aria-hidden="true" style={o.key === "padrao" ? undefined : { background: o.value, ...swatch.css }} className={cn("block h-4 w-4 shrink-0 rounded-full border border-border", o.key === "padrao" && "bg-[repeating-linear-gradient(45deg,var(--muted),var(--muted)_2px,transparent_2px,transparent_4px)]", swatch.cls)} />;
  const cur = tagColor(value);
  return <Select value={cur.key} onValueChange={onChange}><SelectTrigger className="h-8 w-36 text-xs" aria-label={label} title={cur.label}><span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0, lineHeight: 1 }}>{dot(cur)}<span className="truncate text-xs" style={{ lineHeight: "16px" }}>{cur.label}</span></span></SelectTrigger>
    <SelectContent>{TAG_COLORS.map((o) => <SelectItem key={o.key} value={o.key}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }} className="text-xs">{dot(o)}<span>{o.label}</span></span></SelectItem>)}</SelectContent></Select>;
}

/** CDE item Tags: every tag in use, each with independent background/text/border; "Atual" keeps the starting look. */
export function CdeTags({ number, handle }: { number: number; handle?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const saved = useTagStyles();
  const [draft, setDraft] = useState<TagStyles | null>(null);
  const styles = draft ?? saved;
  const statuses = useQuery({ queryKey: ["cde-tag-supply-statuses"], enabled: open, queryFn: async () => (await supabase.from("supply_order_statuses").select("label").eq("active", true)).data ?? [] });
  const rows = useMemo(() => {
    const m = new Map<string, Inv>();
    for (const t of inventory as Inv[]) m.set(tagKey(t.label), t);
    for (const s of statuses.data ?? []) if (s.label && !m.has(tagKey(s.label))) m.set(tagKey(s.label), { label: s.label, variant: "status", className: "", apps: ["Supply"], files: [] });
    return [...m.values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [statuses.data]);
  const where = (t: Inv) => { const seen = new Set<string>(); const apps: string[] = []; const menus: string[] = []; for (const f of t.files) { const l = TAG_LOCATIONS[f]; if (!l) continue; if (!apps.includes(l.app)) apps.push(l.app); const m = `${l.app}: ${l.menu}`; if (!seen.has(m)) { seen.add(m); menus.push(m); } } return { apps: apps.length ? apps : t.apps, menus: menus.length ? menus : t.apps.map((a) => `${a}: situações`) }; };
  const shown = rows.filter((r) => !q.trim() || tagKey(r.label).includes(tagKey(q)) || [...where(r).apps, ...where(r).menus].some((a) => tagKey(a).includes(tagKey(q))));
  const set = (label: string, part: TagPart, v: string) => {
    const k = tagKey(label); const look: TagLook = { ...(styles[k] ?? {}) };
    if (v === "padrao") delete look[part]; else look[part] = v;
    const next = { ...styles }; if (Object.keys(look).length) next[k] = look; else delete next[k];
    setDraft(next);
  };
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
    } catch { toast.error("Não foi possível salvar as tags."); } finally { setSaving(false); }
  }
  return <section className="space-y-4">
    <CdeCategoryHeader handle={handle} number={number} title="Tags" hint="Fundo, texto e borda de cada etiqueta de situação usada nos apps" open={open} onToggle={() => setOpen(!open)} />
    {open && <div className="w-full min-w-0 space-y-3 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{rows.length} tags. “Atual (padrão)” mantém a aparência de hoje. A mesma etiqueta tem a mesma aparência em todos os apps.</p>
        <div className="flex items-center gap-1">
          {draft && <><Button variant="ghost" size="icon" aria-label="Salvar" title="Salvar tags" onClick={save} disabled={saving}><Save /></Button><Button variant="ghost" size="icon" aria-label="Cancelar" title="Cancelar" onClick={() => setDraft(null)}><X /></Button></>}
          <Input aria-label="Buscar tag" placeholder="Buscar tag ou app" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 w-56 text-[length:var(--filter-fs)] md:text-[length:var(--filter-fs)]" />
        </div>
      </div>
      <Table><TableHeader><TableRow><TableHead>Tag</TableHead><TableHead>Apps</TableHead><TableHead>Menus e submenus</TableHead>{PARTS.map(([, l]) => <TableHead key={l}>{l}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{shown.map((t) => { const look = styles[tagKey(t.label)]; return <TableRow key={t.label}>
          <TableCell><Badge variant={(["default", "secondary", "destructive", "outline", "status"].includes(t.variant) ? t.variant : "default") as "default"} className={t.className} cdeLook={look ?? {}}>{t.label}</Badge></TableCell>
          <TableCell className="text-xs text-muted-foreground">{where(t).apps.join(", ")}</TableCell><TableCell className="text-xs text-muted-foreground">{where(t).menus.map((m) => <div key={m}>{m}</div>)}</TableCell>
          {PARTS.map(([p, l]) => <TableCell key={p}><ColorSelect label={`${l} de ${t.label}`} value={look?.[p]} onChange={(v) => set(t.label, p, v)} /></TableCell>)}
        </TableRow>; })}
          {!shown.length && <TableRow><TableCell colSpan={6} className="text-muted-foreground">Nenhuma tag.</TableCell></TableRow>}</TableBody></Table>
    </div>}
  </section>;
}
