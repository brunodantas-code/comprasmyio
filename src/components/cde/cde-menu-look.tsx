import { CdeSection } from "./cde-section";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { CdeButton, useCdeSwatchStyle } from "./cde-button";
import {
  MENU_LOOK_BORDERS,
  MENU_LOOK_COLORS,
  MENU_LOOK_DEFAULT,
  MENU_LOOK_GROUP,
  MENU_LOOK_SHADOWS,
  menuLookBox,
  menuLookColor,
  menuLookVars,
  useMenuLook,
  type MenuLook,
  type MenuLookKind,
} from "./menu-look";

const FIELDS: [MenuLookKind, string][] = [
  ["background", "Fundo do menu"],
  ["text", "Texto dos itens"],
  ["selected", "Item selecionado"],
  ["selectedText", "Texto do selecionado"],
];

const PREVIEW_ITEMS = ["OKRs", "KPIs", "Check-ins", "Ciclos"];

function Pick({ kind, label, value, onChange }: { kind: MenuLookKind; label: string; value: string; onChange: (v: string) => void }) {
  const swatch = useCdeSwatchStyle();
  const dot = (color: string) => <span aria-hidden="true" style={{ background: color, ...swatch.css }} className={`block h-4 w-4 shrink-0 rounded-full border border-border ${swatch.cls}`} />;
  const current = menuLookColor(kind, value);
  return <div className="min-w-0 space-y-1"><Label className="flex min-h-10 items-end pb-1">{label}</Label>
    <Select value={current.key} onValueChange={onChange}><SelectTrigger className="h-9" aria-label={label}><span style={{ display: "inline-flex", alignItems: "center", gap: 10, lineHeight: 1 }} className="min-w-0">{dot(current.value)}<span className="truncate" style={{ lineHeight: "16px" }}>{current.label}</span></span></SelectTrigger>
      <SelectContent>{(MENU_LOOK_COLORS[kind] as readonly { key: string; label: string; value: string }[]).map((o) => <SelectItem key={o.key} value={o.key}><span style={{ display: "inline-flex", alignItems: "center", gap: 10, lineHeight: "16px" }}>{dot(o.value)}<span>{o.label}</span></span></SelectItem>)}</SelectContent></Select></div>;
}

/**
 * Aparência do menu dos apps (grupo menu_look): fundo, texto, item selecionado,
 * borda e sombra. O tipo de menu continua definido por app no item 8, então
 * nenhuma escolha geral sobrescreve a de um app.
 */
export function MenuLookEditor() {
  const qc = useQueryClient();
  const { data: saved = MENU_LOOK_DEFAULT } = useMenuLook();
  const [draft, setDraft] = useState<MenuLook | null>(null);
  const [saving, setSaving] = useState(false);
  const [contentOpen, setContentOpen] = useState(true);
  const style = draft ?? saved;
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(saved);

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão não encontrada");
      const existing = await supabase.from("cde_selected").select("variant_key").eq("group_key", MENU_LOOK_GROUP).eq("is_primary", true).maybeSingle();
      if (existing.error) throw existing.error;
      const row = { variant_key: JSON.stringify(draft), chosen_by: user.id };
      const r = existing.data
        ? await supabase.from("cde_selected").update(row).eq("group_key", MENU_LOOK_GROUP).eq("variant_key", existing.data.variant_key).select("group_key")
        : await supabase.from("cde_selected").insert({ ...row, group_key: MENU_LOOK_GROUP, is_primary: true }).select("group_key");
      if (r.error || !r.data?.length) throw r.error ?? new Error("sem permissão");
      await qc.invalidateQueries({ queryKey: ["cde-menu-look"] });
      setDraft(null);
      toast.success("Aparência do menu atualizada nos apps");
    } catch { toast.error("Não foi possível salvar a aparência do menu."); } finally { setSaving(false); }
  }

  return <CdeSection title="Menu principal dos apps" hint="Aqui se customiza o visual do menu (fundo, texto, item selecionado, borda e sombra) para todos os apps. O tipo de menu de cada app — flutuante, barra inferior, superior, lateral esquerdo ou direito — é definido no item 8 · Ícones dos Apps e menus, na linha do app, em Menu principal do app, com escolha separada para Mobile e Desktop." open={contentOpen} actions={<><Button variant="ghost" size="icon" aria-label="Salvar" title="Salvar aparência do menu" onClick={save} disabled={saving || !dirty}><Save /></Button><Button variant="ghost" size="icon" aria-label="Cancelar" title="Cancelar" onClick={() => setDraft(null)}><X /></Button><CdeButton group="toggle" screen="components/cde/cde-menu-look.tsx" aria-label={`${contentOpen ? "Recolher" : "Exibir"} Menu principal dos apps`} title={`${contentOpen ? "Recolher" : "Exibir"} Menu principal dos apps`} aria-expanded={contentOpen} onClick={() => setContentOpen(!contentOpen)} /></>}>
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
      {FIELDS.map(([k, l]) => <Pick key={k} kind={k} label={l} value={style[k]} onChange={(v) => setDraft({ ...style, [k]: v })} />)}
      <div className="min-w-0 space-y-1"><Label className="flex min-h-10 items-end pb-1">Borda do painel</Label>
        <Select value={style.border} onValueChange={(v) => setDraft({ ...style, border: v as MenuLook["border"] })}><SelectTrigger className="h-9" aria-label="Borda do painel"><SelectValue /></SelectTrigger>
          <SelectContent>{MENU_LOOK_BORDERS.map((b) => <SelectItem key={b.key} value={b.key}>{b.label}</SelectItem>)}</SelectContent></Select></div>
      <div className="min-w-0 space-y-1"><Label className="flex min-h-10 items-end pb-1">Sombreamento</Label>
        <Select value={style.shadow} onValueChange={(v) => setDraft({ ...style, shadow: v as MenuLook["shadow"] })}><SelectTrigger className="h-9" aria-label="Sombreamento do painel"><SelectValue /></SelectTrigger>
          <SelectContent>{MENU_LOOK_SHADOWS.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent></Select></div>
      <div className="min-w-0 space-y-1"><Label htmlFor="menu-side-width" className="flex min-h-10 items-end pb-1">Largura do menu lateral (px)</Label>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <Input bufferedNumber id="menu-side-width" type="number" min={160} max={400} step={1} value={style.sideWidth ?? 240} onChange={(event) => { const value = event.currentTarget.valueAsNumber; if (Number.isFinite(value)) setDraft({ ...style, sideWidth: Math.max(160, Math.min(400, value)) }); }} />
          <span className="flex shrink-0 items-center gap-2"><Checkbox id="menu-flexible" checked={style.flexible} onCheckedChange={checked => setDraft({ ...style, flexible: checked === true })} /><Label htmlFor="menu-flexible">Flexível</Label></span>
        </div>
      </div>
      <div className="min-w-0 space-y-1"><Label htmlFor="menu-button-height" className="flex min-h-10 items-end pb-1">Altura dos botões (px)</Label>
        <Input bufferedNumber id="menu-button-height" type="number" min={36} max={80} step={1} value={style.buttonHeight} onChange={(event) => { const value = event.currentTarget.valueAsNumber; if (Number.isFinite(value)) setDraft({ ...style, buttonHeight: Math.max(36, Math.min(80, value)) }); }} />
      </div>
    </div>
    <div className="space-y-1"><p className="text-xs text-muted-foreground">Prévia</p>
      <div style={{ ...menuLookVars(style), ...menuLookBox(style), width: "var(--app-menu-side-custom-width, 240px)" }} className="app-menu-fixed-preview max-w-full rounded-md p-2">
        {PREVIEW_ITEMS.map((label, i) => <div key={label} style={{ height: "var(--app-menu-side-button-height, 44px)" }} className={`app-menu-fixed-preview-item flex items-center gap-2 rounded px-2 text-xs ${i === 0 ? "app-menu-fixed-preview-active font-semibold" : ""}`}>{label}</div>)}
      </div>
    </div>
  </CdeSection>;
}
