import { FontFormatControl } from "./font-format-control";
import { CdeSection } from "./cde-section";
import { CdeNumber } from "@/components/cde/cde-button";
import { useEffect, useState } from "react";
import type React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Minus, Plus, Save, Menu } from "lucide-react";
import { MyioPlatformLogo } from "@/components/myio-platform-logo";
import { MyioAppLogo } from "@/components/myio-app-logo";
import { appDescription, AppTileDescription, AppSymbol, AppTileFace } from "./app-tile";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CdeCategoryHeader } from "./cde-category-header";
import { APP_NAME_COLORS, APP_TILE_DEFAULT, PORTAL_APPS, appDisplay, appLogoPx, appTileColor, appTileColorList, appTileColorVars, scopedAppTileVars, appTileLowContrast, homeHeaderVars, homeHeaderLogoTone, mobileTileVars, parseAppOrder, useAppOrder, useAppTile, resolveAppTile, appTileScope, updateAppTileProfile, type TileStyleScope, type AppDisplayOverride, type AppTileColorKind, type AppTileConfig } from "./app-order-config";
import { CdeButton, useCdeSwatchStyle } from "./cde-button";
import { themedColorOptions } from "./appearance-names";
import { useActiveAppearance } from "./app-appearance";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CdeMobileDockStyle } from "./mobile-dock-style";
import { CdeCodeApps } from "./cde-code-apps";
import { CdeAppShortcuts } from "./cde-app-shortcuts";

function Row({ id, index, displayName }: { id: string; index: number; displayName: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const app = PORTAL_APPS.find((a) => a.key === id);
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="flex items-center gap-3 border-b border-border bg-card py-2">
    <Button variant="ghost" size="compactIcon" aria-label={`Mover ${displayName}`} title={`Mover ${displayName}`} {...attributes} {...listeners} className="touch-none"><GripVertical /></Button>
    <CdeNumber screen="components/cde/cde-app-order.tsx">{index + 1}</CdeNumber>
    <span className="flex h-7 w-7 shrink-0 items-center justify-center text-foreground"><AppSymbol name={app?.name ?? ""} className="h-5 w-5" /></span>
    <span className="flex-1 text-sm">{displayName}</span>
  </div>;
}

const COLOR_FIELDS: [AppTileColorKind, string][] = [["bg", "Fundo da página"], ["fill", "Preenchimento dos ícones"], ["border", "Borda dos ícones"], ["symbol", "Símbolo dentro do ícone"], ["inside", "Texto dentro do ícone"]];

function HeaderPreview({ tile, mobile = false, appName, display }: { tile: AppTileConfig; mobile?: boolean; appName?: string; display?: ReturnType<typeof appDisplay> }) {
  const background = tile.headerBg === "padrao" ? (mobile && !appName ? "var(--accent)" : "var(--card)") : appTileColor("headerBg", tile.headerBg).value;
  const tone = appName && tile.headerBg === "padrao" ? "auto" : homeHeaderLogoTone(tile, mobile);
  return <div aria-label={mobile ? (appName ? "Prévia do cabeçalho do app mobile" : "Prévia da faixa superior mobile") : appName ? "Prévia do cabeçalho do app" : "Prévia da faixa superior desktop"} style={{ ...homeHeaderVars(tile), "--home-header-bg": background } as React.CSSProperties} className={`home-page-header px-4 py-5 ${mobile ? "" : "home-header-desktop-preview flex items-center"}`}>
    <div className="flex w-full items-center justify-between gap-3">{appName ? <MyioAppLogo appName={appName} logoPx={appLogoPx(tile)} tone={tone} {...(display ? { display } : {})} /> : <MyioPlatformLogo tone={tone} logoPx={appLogoPx(tile)} />}<div className="flex min-w-0 items-center gap-3">{!mobile && <span className="text-sm">Usuário</span>}<Menu aria-hidden className="h-6 w-6 shrink-0" /></div></div>
    {mobile && !appName && <p className="mt-8 text-xl font-bold">Olá, Usuário</p>}
  </div>;
}

/** Brand-only colour picker: options come from APP_TILE_COLORS, swatch shape follows CDE color_swatch. */
function ColorChoice({ kind, label, value, onChange }: { kind: AppTileColorKind; label: string; value: string; onChange: (v: string) => void }) {
  const swatch = useCdeSwatchStyle();
  const options = themedColorOptions(appTileColorList(kind), useActiveAppearance());
  const dot = (color: string) => <span aria-hidden="true" style={{ background: color, ...swatch.css }} className={`block h-4 w-4 shrink-0 rounded-full border border-border ${swatch.cls}`} />;
  const current = appTileColor(kind, value);
  const currentLabel = options.find((o) => o.key === current.key)?.label ?? current.label;
  return <div className="min-w-0 space-y-1"><Label className="flex min-h-10 items-end pb-1">{label}</Label>
    <Select value={current.key} onValueChange={onChange}><SelectTrigger className="h-9" aria-label={label}><span style={{ display: "inline-flex", alignItems: "center", gap: 10, lineHeight: 1 }} className="min-w-0">{dot(current.value)}<span className="truncate" style={{ lineHeight: "16px" }}>{currentLabel}</span></span></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o.key} value={o.key}><span style={{ display: "inline-flex", alignItems: "center", gap: 10, lineHeight: "16px" }}>{dot(o.value)}<span>{o.label}</span></span></SelectItem>)}</SelectContent></Select></div>;
}

function AppNameColorChoice({ appName, value, onChange }: { appName: string; value: string; onChange: (value: string) => void }) {
  const swatch = useCdeSwatchStyle();
  const options = themedColorOptions(APP_NAME_COLORS, useActiveAppearance());
  const current = options.find(option => option.key === value) ?? options[0];
  const dot = (color: string) => <span aria-hidden="true" style={{ background: color, ...swatch.css }} className={`block h-4 w-4 shrink-0 rounded-full border border-border ${swatch.cls}`} />;
  return <div className="min-w-0 space-y-1"><Label>Cor da fonte</Label><Select value={current.key} onValueChange={onChange}><SelectTrigger aria-label={`Cor da fonte de ${appName}`} className="h-9"><div className="flex min-w-0 flex-1 items-center gap-2 text-left">{dot(current.value)}<span className="truncate">{current.label}</span></div></SelectTrigger><SelectContent>{options.map(option => <SelectItem key={option.key} value={option.key}><span className="flex items-center gap-2">{dot(option.value)}<span>{option.label}</span></span></SelectItem>)}</SelectContent></Select></div>;
}

export function CdeAppOrder({ number, handle }: { number: number; handle?: import("react").ReactNode }) {
  const [open, setOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(true);
  const [namesOpen, setNamesOpen] = useState(true);
  const [iconsOpen, setIconsOpen] = useState(true);
  const [headerOpen, setHeaderOpen] = useState(true);
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const { data } = useAppOrder();
  const qc = useQueryClient();
  const savedTile = useAppTile(true).data ?? APP_TILE_DEFAULT;
  const [tileDraft, setRawTileDraft] = useState<AppTileConfig | null>(null);
  const appearance = useActiveAppearance();
  const [onMobile, setOnMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)');
    const sync = () => { setOnMobile(media.matches); setRawTileDraft(null); };
    sync(); media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  useEffect(() => { setRawTileDraft(null); }, [appearance]);
  const editingScope: TileStyleScope = appTileScope(appearance === 'purple' ? 'purple' : 'green', onMobile);
  const baseTile = tileDraft ?? savedTile;
  const targetAppearance = editingScope.startsWith('purple') ? 'purple' : 'green';
  const tile = appearance === 'grayscale' ? baseTile : resolveAppTile(baseTile, targetAppearance, onMobile);
  const desktopTile = resolveAppTile(baseTile, targetAppearance, false);
  const mobileTile = resolveAppTile(baseTile, targetAppearance, true);
  function setTileDraft(next: AppTileConfig | null) {
    setRawTileDraft(next ? (appearance === 'grayscale' ? next : updateAppTileProfile(baseTile, editingScope, next)) : null);
  }
  function updateApp(key: string, patch: Partial<AppDisplayOverride>) {
    const existing = tile.apps?.[key] ?? {};
    setTileDraft({ ...tile, apps: { ...tile.apps, [key]: { ...existing, ...patch } } });
  }
  async function saveTile() {
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão não encontrada");
      const existing = await supabase.from("cde_selected").select("variant_key").eq("group_key", "app_tile").eq("is_primary", true).maybeSingle();
      if (existing.error) throw existing.error;
      const row = { variant_key: JSON.stringify(baseTile), chosen_by: user.id };
      const result = existing.data ? await supabase.from("cde_selected").update(row).eq("group_key", "app_tile").eq("is_primary", true).eq("variant_key", existing.data.variant_key).select("variant_key").single() : await supabase.from("cde_selected").insert({ ...row, group_key: "app_tile" }).select("variant_key").single();
      if (result.error) throw result.error;
      if (result.data?.variant_key !== row.variant_key) throw new Error("O padrão não foi salvo. Recarregue e tente novamente.");
      await qc.invalidateQueries({ queryKey: ["cde-app-tile"] });
      setTileDraft(null); toast.success("Padrão da Home Page atualizado");
    } catch { toast.error("Não foi possível salvar o padrão."); } finally { setSaving(false); }
  }
  const order = draft ?? data ?? parseAppOrder();
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  function move(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    setDraft(arrayMove(order, order.indexOf(String(e.active.id)), order.indexOf(String(e.over.id))));
  }
  async function save() {
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão não encontrada");
      const existing = await supabase.from("cde_selected").select("variant_key").eq("group_key", "app_order").eq("is_primary", true).maybeSingle();
      if (existing.error) throw existing.error;
      const row = { variant_key: JSON.stringify(order), chosen_by: user.id };
      const result = existing.data ? await supabase.from("cde_selected").update(row).eq("group_key", "app_order").eq("variant_key", existing.data.variant_key) : await supabase.from("cde_selected").insert({ ...row, group_key: "app_order" });
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: ["cde-app-order"] });
      setDraft(null); toast.success("Ordem dos apps atualizada");
    } catch { toast.error("Não foi possível salvar a ordem."); } finally { setSaving(false); }
  }
  return <section className="cde-category-sections">
    <CdeCategoryHeader handle={handle} number={number} title="Home Page" hint="Faixa superior, apps, espaçamento e cores" open={open} onToggle={() => setOpen(!open)} />
    {open && <div><div className="py-3 text-sm text-muted-foreground" aria-label="Versão da Home em edição">{appearance === 'purple' ? 'Roxo' : appearance === 'green' ? 'Verde' : 'P&B'} — {onMobile ? 'Mobile' : 'Desktop'}</div><CdeSection title="Ordenação dos Apps na Home Page" open={orderOpen} actions={<><Button variant="ghost" size="icon" title="Salvar ordem dos apps" aria-label="Salvar ordem dos apps" onClick={save} disabled={saving || !draft}><Save /></Button><CdeButton group="toggle" screen="components/cde/cde-app-order.tsx" aria-label={`${orderOpen ? "Recolher" : "Exibir"} ordenação dos apps`} title={`${orderOpen ? "Recolher" : "Exibir"} ordenação dos apps`} aria-expanded={orderOpen} onClick={() => setOrderOpen(!orderOpen)} /></>}><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={move}><SortableContext items={order} strategy={verticalListSortingStrategy}>{order.map((id, i) => <Row key={id} id={id} index={i} displayName={appDisplay(tile, id).name} />)}</SortableContext></DndContext></CdeSection>
      
      <CdeCodeApps />
      <CdeAppShortcuts tile={tile} />
      <CdeSection title="Nomes e fontes dos apps" open={namesOpen} actions={<><Button variant="ghost" size="icon" aria-label="Salvar Home Page" title="Salvar Home Page" onClick={saveTile} disabled={saving || !tileDraft}><Save /></Button><CdeButton group="toggle" screen="components/cde/cde-app-order.tsx" aria-label={`${namesOpen ? "Recolher" : "Exibir"} nomes e fontes dos apps`} title={`${namesOpen ? "Recolher" : "Exibir"} nomes e fontes dos apps`} aria-expanded={namesOpen} onClick={() => setNamesOpen(!namesOpen)} /></>}>
        
        <div role="group" aria-label="Nomes e fontes dos apps" className="grid gap-4 xl:grid-cols-2">
          {PORTAL_APPS.map(app => { const display = appDisplay(tile, app.key); const caption = tile.apps?.[app.key]; return <div key={app.key} className="space-y-3"><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_10rem] sm:items-end">
            <div className="min-w-0 space-y-1"><Label>Nome — {app.name}</Label><Input aria-label={`Nome do app ${app.name}`} maxLength={30} value={tile.apps?.[app.key]?.name ?? display.name} onChange={event => updateApp(app.key, { name: event.target.value })} /></div>
            <div className="min-w-0 space-y-1"><Label>Tamanho</Label><Select value={String(display.labelPx)} onValueChange={value => updateApp(app.key, { labelPx: Number(value) })}><SelectTrigger aria-label={`Tamanho da fonte de ${app.name}`} className="h-9"><SelectValue /></SelectTrigger><SelectContent>{[10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32].map(px => <SelectItem key={px} value={String(px)}>{px} px</SelectItem>)}</SelectContent></Select></div>
            <FontFormatControl context={`Nome de ${app.name}`} value={display.format ?? {}} onChange={format => updateApp(app.key, { format })} />
            <AppNameColorChoice appName={app.name} value={display.colorKey} onChange={color => updateApp(app.key, { color })} />
          </div><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_10rem] sm:items-end">
            <div className="min-w-0 space-y-1"><Label>Texto abaixo do ícone — {app.name}</Label><Textarea aria-label={`Texto abaixo do ícone de ${app.name}`} rows={2} value={appDescription(tile, app.key)} onChange={event => updateApp(app.key, { description: event.target.value })} /></div>
            <div className="min-w-0 space-y-1"><Label>Tamanho</Label><Select value={String(caption?.descriptionPx ?? "padrao")} onValueChange={value => { const { descriptionPx: _old, ...rest } = caption ?? {}; setTileDraft({ ...tile, apps: { ...tile.apps, [app.key]: { ...rest, ...(value !== "padrao" ? { descriptionPx: Number(value) } : {}) } } }); }}><SelectTrigger aria-label={`Tamanho da legenda de ${app.name}`} className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="padrao">Atual</SelectItem>{[10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32].map(px => <SelectItem key={px} value={String(px)}>{px} px</SelectItem>)}</SelectContent></Select></div>
            <FontFormatControl context={`Legenda de ${app.name}`} value={caption?.descriptionFormat ?? {}} onChange={descriptionFormat => updateApp(app.key, { descriptionFormat })} />
            <AppNameColorChoice appName={`legenda de ${app.name}`} value={caption?.descriptionColor ?? "padrao"} onChange={descriptionColor => updateApp(app.key, { descriptionColor })} />
          </div>
          </div>; })}
        </div>
        <div className="max-w-xs"><ColorChoice kind="below" label="Cor padrão dos textos abaixo dos ícones" value={tile.below} onChange={below => setTileDraft({ ...tile, below })} /></div>

      </CdeSection>
      <CdeSection title="Faixa superior dos apps" hint="Logo myio, cor e altura da faixa da Home e dos apps" open={headerOpen} actions={<><Button variant="ghost" size="icon" aria-label="Salvar faixa superior dos apps" title="Salvar faixa superior dos apps" onClick={saveTile} disabled={saving || !tileDraft}><Save /></Button><CdeButton group="toggle" screen="components/cde/cde-app-order.tsx" aria-label={`${headerOpen ? "Recolher" : "Exibir"} faixa superior dos apps`} title={`${headerOpen ? "Recolher" : "Exibir"} faixa superior dos apps`} aria-expanded={headerOpen} onClick={() => setHeaderOpen(!headerOpen)} /></>}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1"><Label className="flex min-h-10 items-end pb-1">Tamanho do logo myio</Label><Select value={String(appLogoPx(tile))} onValueChange={value => setTileDraft({ ...tile, appLogoPx: Number(value) })}><SelectTrigger aria-label="Tamanho do logo myio" className="h-9"><SelectValue /></SelectTrigger><SelectContent>{[24, 28, 32, 36, 40, 44, 48, 56, 64].map(px => <SelectItem key={px} value={String(px)}>{px} px</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><Label className="flex min-h-10 items-end pb-1">Altura da faixa superior — Desktop</Label><Select value={String(tile.desktopHeaderPx ?? 0)} onValueChange={v => { const { desktopHeaderPx: _old, ...rest } = tile; setTileDraft({ ...rest, ...(Number(v) ? { desktopHeaderPx: Number(v) } : {}) }); }}><SelectTrigger aria-label="Altura da faixa superior Desktop"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0">Ajustar ao conteúdo</SelectItem>{[80, 90, 100, 110, 120, 140, 160, 180, 200, 240].map(px => <SelectItem key={px} value={String(px)}>{px} px</SelectItem>)}</SelectContent></Select></div>
          <ColorChoice kind="headerBg" label="Fundo da faixa superior" value={tile.headerBg} onChange={headerBg => setTileDraft({ ...tile, headerBg })} />
        </div>
        <div className="space-y-1"><Label>Prévia da faixa dos apps — Desktop</Label><HeaderPreview tile={desktopTile} appName="CRM" display={appDisplay(desktopTile, "crm", 16)} /></div>
        <div className="space-y-1"><Label>Prévia da faixa da Home — Desktop</Label><HeaderPreview tile={desktopTile} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0 max-w-[390px] space-y-1"><Label>Prévia da faixa dos apps — Mobile</Label><HeaderPreview tile={mobileTile} mobile appName="CRM" display={appDisplay(mobileTile, "crm", 16)} /></div>
          <div className="min-w-0 max-w-[390px] space-y-1"><Label>Prévia da faixa da Home — Mobile</Label><HeaderPreview tile={mobileTile} mobile /></div>
        </div>
      </CdeSection>
      <CdeSection title="Ícones da página principal" open={iconsOpen} actions={<><Button variant="ghost" size="icon" aria-label="Salvar Home Page" title="Salvar Home Page" onClick={saveTile} disabled={saving || !tileDraft}><Save /></Button><CdeButton group="toggle" screen="components/cde/cde-app-order.tsx" aria-label={`${iconsOpen ? "Recolher" : "Exibir"} ícones da página principal`} title={`${iconsOpen ? "Recolher" : "Exibir"} ícones da página principal`} aria-expanded={iconsOpen} onClick={() => setIconsOpen(!iconsOpen)} /></>}>
        
        <div role="group" aria-label="Ajustes dos ícones da página principal" className="grid w-full grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.25fr)_repeat(6,minmax(0,1fr))]">
          <div className="min-w-0 space-y-3"><div className="space-y-1"><Label className="flex min-h-10 items-end pb-1">Fonte do nome</Label><Select value={String(tile.labelPx)} onValueChange={(v) => setTileDraft({ ...tile, labelPx: Number(v) })}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent>{[11, 12, 13, 14, 15, 16].map((n) => <SelectItem key={n} value={String(n)}>{n} px</SelectItem>)}</SelectContent></Select></div>
          <FontFormatControl context="Nomes dos apps" value={tile.format ?? {}} onChange={format => setTileDraft({ ...tile, format })} /></div>
          <div className="min-w-0 space-y-1"><Label className="flex min-h-10 items-end pb-1">Ícone Desktop</Label>
            <div className="grid h-9 w-full max-w-36 grid-cols-[2rem_minmax(0,1fr)_2rem] items-center justify-items-center">
              <Button variant="outline" size="compactIcon" aria-label="Diminuir ícone Desktop" title="Diminuir ícone Desktop" disabled={tile.tilePct <= 70} onClick={() => setTileDraft({ ...tile, tilePct: tile.tilePct - 5 })}><Minus /></Button>
              <span className="min-w-0 w-full text-center text-sm tabular-nums">{tile.tilePct}%</span>
              <Button variant="outline" size="compactIcon" aria-label="Aumentar ícone Desktop" title="Aumentar ícone Desktop" disabled={tile.tilePct >= 140} onClick={() => setTileDraft({ ...tile, tilePct: tile.tilePct + 5 })}><Plus /></Button>
            </div><p className="w-full max-w-36 text-center text-xs tabular-nums text-muted-foreground">{Number((112 * tile.tilePct / 100).toFixed(1))} × {Number((112 * tile.tilePct / 100).toFixed(1))} px</p></div>
          <div className="min-w-0 space-y-1"><Label className="flex min-h-10 items-end pb-1">Ícone Mobile</Label><div className="grid h-9 w-full max-w-36 grid-cols-[2rem_minmax(0,1fr)_2rem] items-center justify-items-center">
            <Button variant="outline" size="compactIcon" aria-label="Diminuir ícone Mobile" title="Diminuir ícone Mobile" disabled={tile.mobileTilePct <= 70} onClick={() => setTileDraft({ ...tile, mobileTilePct: tile.mobileTilePct - 5 })}><Minus /></Button>
            <span className="min-w-0 w-full text-center text-sm tabular-nums">{tile.mobileTilePct}%</span>
            <Button variant="outline" size="compactIcon" aria-label="Aumentar ícone Mobile" title="Aumentar ícone Mobile" disabled={tile.mobileTilePct >= 140} onClick={() => setTileDraft({ ...tile, mobileTilePct: tile.mobileTilePct + 5 })}><Plus /></Button>
          </div><p className="w-full max-w-36 text-center text-xs tabular-nums text-muted-foreground">{Number((80 * tile.mobileTilePct / 100).toFixed(1))} × {Number((80 * tile.mobileTilePct / 100).toFixed(1))} px</p></div>
          <div className="min-w-0 space-y-1"><Label className="flex min-h-10 items-end pb-1">Símbolo Desktop</Label>
            <div className="grid h-9 w-full max-w-36 grid-cols-[2rem_minmax(0,1fr)_2rem] items-center justify-items-center">
              <Button variant="outline" size="compactIcon" aria-label="Diminuir símbolo Desktop" title="Diminuir símbolo Desktop" disabled={tile.iconPct <= 60} onClick={() => setTileDraft({ ...tile, iconPct: tile.iconPct - 5 })}><Minus /></Button>
              <span className="min-w-0 w-full text-center text-sm tabular-nums">{tile.iconPct}%</span>
              <Button variant="outline" size="compactIcon" aria-label="Aumentar símbolo Desktop" title="Aumentar símbolo Desktop" disabled={tile.iconPct >= 140} onClick={() => setTileDraft({ ...tile, iconPct: tile.iconPct + 5 })}><Plus /></Button>
            </div></div>
          <div className="min-w-0 space-y-1"><Label className="flex min-h-10 items-end pb-1">Símbolo Mobile</Label><div className="grid h-9 w-full max-w-36 grid-cols-[2rem_minmax(0,1fr)_2rem] items-center justify-items-center">
            <Button variant="outline" size="compactIcon" aria-label="Diminuir símbolo Mobile" title="Diminuir símbolo Mobile" disabled={tile.mobileIconPct <= 60} onClick={() => setTileDraft({ ...tile, mobileIconPct: tile.mobileIconPct - 5 })}><Minus /></Button>
            <span className="min-w-0 w-full text-center text-sm tabular-nums">{tile.mobileIconPct}%</span>
            <Button variant="outline" size="compactIcon" aria-label="Aumentar símbolo Mobile" title="Aumentar símbolo Mobile" disabled={tile.mobileIconPct >= 140} onClick={() => setTileDraft({ ...tile, mobileIconPct: tile.mobileIconPct + 5 })}><Plus /></Button>
          </div></div>
          {([['gapX', 'Espaçamento horizontal'], ['gapY', 'Espaçamento vertical']] as const).map(([key, label]) => <div key={key} className="min-w-0 space-y-1"><Label className="flex min-h-10 items-end pb-1">{label}</Label><div className="grid h-9 w-full max-w-36 grid-cols-[2rem_minmax(0,1fr)_2rem] items-center justify-items-center">
            <Button variant="outline" size="compactIcon" aria-label={`Diminuir ${label.toLowerCase()}`} title="Diminuir" disabled={tile[key] <= 8} onClick={() => setTileDraft({ ...tile, [key]: Math.max(8, tile[key] - 4) })}><Minus /></Button>
            <span className="min-w-0 w-full text-center text-sm tabular-nums">{tile[key]} px</span>
            <Button variant="outline" size="compactIcon" aria-label={`Aumentar ${label.toLowerCase()}`} title="Aumentar" disabled={tile[key] >= 80} onClick={() => setTileDraft({ ...tile, [key]: Math.min(80, tile[key] + 4) })}><Plus /></Button>
          </div></div>)}
        </div>

        <div className="min-w-0 space-y-1"><Label>Estilo dos ícones</Label><Select value={tile.fill === 'flat' && tile.border === 'flat' ? 'flat' : 'filled'} onValueChange={value => { if (value === 'flat') setTileDraft({ ...tile, fill: 'flat', border: 'flat', symbol: 'verde', inside: 'verde' }); else setTileDraft({ ...tile, fill: tile.fill === 'flat' ? 'padrao' : tile.fill, border: tile.border === 'flat' ? 'padrao' : tile.border }); }}><SelectTrigger aria-label="Estilo dos ícones da versão selecionada"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="filled">Preenchido com borda</SelectItem><SelectItem value="flat">Flat minimalista</SelectItem></SelectContent></Select></div>

        <p className="pt-2 text-sm font-medium">Cores da página principal (Manual da Marca myio)</p>
        <div role="group" aria-label="Cores da página principal" className="grid w-full max-w-5xl grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-5">
          {COLOR_FIELDS.map(([kind, label]) => <ColorChoice key={kind} kind={kind} label={label} value={tile[kind]} onChange={(v) => setTileDraft({ ...tile, [kind]: v })} />)}
        </div>
        {appTileLowContrast(tile) && <p className="text-xs text-destructive">O texto abaixo dos ícones fica pouco visível neste fundo; escolha uma cor de texto contrastante.</p>}
        <div className="space-y-1"><Label>Prévia desktop</Label>
          <div aria-label="Prévia dos apps" style={{ columnGap: desktopTile.gapX, rowGap: desktopTile.gapY, ...scopedAppTileVars(baseTile, targetAppearance, false) } as React.CSSProperties} className="flex w-full flex-wrap bg-[var(--portal-bg)] px-4 py-10 sm:py-14">
            {order.map((key) => { const app = PORTAL_APPS.find((a) => a.key === key); return app ? <div key={key} style={{ zoom: desktopTile.tilePct / 100 }} className="flex w-28 min-w-0 flex-col items-center text-center">
              <div className="relative flex h-28 w-28 flex-col items-center justify-between rounded-3xl border-2 border-[color:var(--tile-border)] bg-[var(--tile-fill)] px-2 pb-2 pt-1.5 text-primary-foreground"><AppTileFace appKey={key} name={app.name} tile={desktopTile} /></div>
              <AppTileDescription appKey={key} tile={desktopTile} />
            </div> : null; })}
          </div></div>
        <div className="space-y-1"><Label>Prévia mobile</Label>
          <div aria-label="Prévia mobile dos apps" style={{ ...scopedAppTileVars(baseTile, targetAppearance, true), ...mobileTileVars(mobileTile) } as React.CSSProperties} className="mobile-app-grid grid w-full max-w-[390px] bg-[var(--portal-bg)] px-3 py-8">
            {order.map(key => { const app = PORTAL_APPS.find(a => a.key === key); return app ? <div key={key} className="flex min-w-0 flex-col items-center text-center">
              <div className="mobile-app-tile relative flex flex-col items-center justify-between rounded-2xl border-2 border-[color:var(--tile-border)] bg-[var(--tile-fill)] px-1 pb-2 pt-1 text-primary-foreground"><AppTileFace appKey={key} name={app.name} tile={mobileTile} mobile /></div>
              <AppTileDescription appKey={key} tile={mobileTile} mobile />
            </div> : null; })}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">No celular, a fonte fica 2 px menor. Os símbolos mais finos recebem correção automática para parecerem do mesmo tamanho.</p>
        
      </CdeSection><CdeMobileDockStyle /></div>}
  </section>;
}
