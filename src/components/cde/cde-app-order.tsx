import { CdeNumber } from "@/components/cde/cde-button";
import { useState } from "react";
import type React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Minus, Plus, Save, Menu } from "lucide-react";
import { MyioPlatformLogo } from "@/components/myio-platform-logo";
import { MyioAppLogo } from "@/components/myio-app-logo";
import { APP_DESCRIPTIONS, AppSymbol, AppTileFace } from "./app-tile";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CdeCategoryHeader } from "./cde-category-header";
import { APP_NAME_COLORS, APP_TILE_COLORS, APP_TILE_DEFAULT, PORTAL_APPS, appDisplay, appTileColor, appTileColorVars, appTileLowContrast, homeHeaderVars, homeHeaderLogoTone, mobileTileVars, parseAppOrder, useAppOrder, useAppTile, type AppDisplayOverride, type AppTileColorKind, type AppTileConfig } from "./app-order-config";
import { useCdeSwatchStyle } from "./cde-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CdeMobileDockStyle } from "./mobile-dock-style";

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

const COLOR_FIELDS: [AppTileColorKind, string][] = [["headerBg", "Fundo da faixa superior"], ["bg", "Fundo da página"], ["fill", "Preenchimento dos ícones"], ["border", "Borda dos ícones"], ["symbol", "Símbolo dentro do ícone"], ["inside", "Texto dentro do ícone"], ["below", "Texto abaixo do ícone"]];

function HeaderPreview({ tile, mobile = false, appName, display }: { tile: AppTileConfig; mobile?: boolean; appName?: string; display?: ReturnType<typeof appDisplay> }) {
  const background = tile.headerBg === "padrao" ? (mobile ? "var(--accent)" : "var(--card)") : appTileColor("headerBg", tile.headerBg).value;
  return <div aria-label={mobile ? "Prévia da faixa superior mobile" : appName ? "Prévia do cabeçalho do app" : "Prévia da faixa superior desktop"} style={{ ...homeHeaderVars(tile), "--home-header-bg": background } as React.CSSProperties} className={`home-page-header px-4 py-5 ${mobile ? "" : "home-header-desktop-preview flex items-center"}`}>
    <div className="flex items-center justify-between gap-3">{appName ? <MyioAppLogo appName={appName} tone={homeHeaderLogoTone(tile, mobile)} {...(display ? { display } : {})} /> : <MyioPlatformLogo tone={homeHeaderLogoTone(tile, mobile)} className="h-10" />}<div className="flex min-w-0 items-center gap-3">{!mobile && <span className="text-sm">Usuário</span>}<Menu aria-hidden className="h-6 w-6 shrink-0" /></div></div>
    {mobile && <p className="mt-8 text-xl font-bold">Olá, Usuário</p>}
  </div>;
}

/** Brand-only colour picker: options come from APP_TILE_COLORS, swatch shape follows CDE color_swatch. */
function ColorChoice({ kind, label, value, onChange }: { kind: AppTileColorKind; label: string; value: string; onChange: (v: string) => void }) {
  const swatch = useCdeSwatchStyle();
  const dot = (color: string) => <span aria-hidden="true" style={{ background: color, ...swatch.css }} className={`block h-4 w-4 shrink-0 rounded-full border border-border ${swatch.cls}`} />;
  const current = appTileColor(kind, value);
  return <div className="min-w-0 space-y-1"><Label className="flex min-h-10 items-end pb-1">{label}</Label>
    <Select value={current.key} onValueChange={onChange}><SelectTrigger className="h-9" aria-label={label}><span style={{ display: "inline-flex", alignItems: "center", gap: 10, lineHeight: 1 }} className="min-w-0">{dot(current.value)}<span className="truncate" style={{ lineHeight: "16px" }}>{current.label}</span></span></SelectTrigger>
      <SelectContent>{APP_TILE_COLORS[kind].map((o) => <SelectItem key={o.key} value={o.key}><span style={{ display: "inline-flex", alignItems: "center", gap: 10, lineHeight: "16px" }}>{dot(o.value)}<span>{o.label}</span></span></SelectItem>)}</SelectContent></Select></div>;
}

function AppNameColorChoice({ appName, value, onChange }: { appName: string; value: string; onChange: (value: string) => void }) {
  const swatch = useCdeSwatchStyle();
  const current = APP_NAME_COLORS.find(option => option.key === value) ?? APP_NAME_COLORS[0];
  const dot = (color: string) => <span aria-hidden="true" style={{ background: color, ...swatch.css }} className={`block h-4 w-4 shrink-0 rounded-full border border-border ${swatch.cls}`} />;
  return <div className="min-w-0 space-y-1"><Label>Cor da fonte</Label><Select value={current.key} onValueChange={onChange}><SelectTrigger aria-label={`Cor da fonte de ${appName}`} className="h-9"><span className="flex min-w-0 items-center gap-2">{dot(current.value)}<span className="truncate">{current.label}</span></span></SelectTrigger><SelectContent>{APP_NAME_COLORS.map(option => <SelectItem key={option.key} value={option.key}><span className="flex items-center gap-2">{dot(option.value)}<span>{option.label}</span></span></SelectItem>)}</SelectContent></Select></div>;
}

export function CdeAppOrder({ number, handle }: { number: number; handle?: import("react").ReactNode }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const { data } = useAppOrder();
  const qc = useQueryClient();
  const savedTile = useAppTile().data ?? APP_TILE_DEFAULT;
  const [tileDraft, setTileDraft] = useState<AppTileConfig | null>(null);
  const tile = tileDraft ?? savedTile;
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
      const row = { variant_key: JSON.stringify(tile), chosen_by: user.id };
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
  return <section className="space-y-4">
    <CdeCategoryHeader handle={handle} number={number} title="Home Page" hint="Faixa superior, apps, espaçamento e cores" open={open} onToggle={() => setOpen(!open)} />
    {open && <div className="w-full min-w-0 py-4"><p className="mb-3 text-sm font-medium">Ordenação dos Apps na Home Page</p><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={move}><SortableContext items={order} strategy={verticalListSortingStrategy}>{order.map((id, i) => <Row key={id} id={id} index={i} displayName={appDisplay(tile, id).name} />)}</SortableContext></DndContext>
      <Button variant="action" className="mt-3" onClick={save} disabled={saving || !draft}><Save className="h-4 w-4" />Salvar</Button>
      <div className="mt-6 space-y-4 border-t border-border pt-4">
        <p className="text-sm font-medium">Nomes e fontes dos apps</p>
        <div role="group" aria-label="Nomes e fontes dos apps" className="grid gap-4 xl:grid-cols-2">
          {PORTAL_APPS.map(app => { const display = appDisplay(tile, app.key); return <div key={app.key} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_10rem] sm:items-end">
            <div className="min-w-0 space-y-1"><Label>Nome — {app.name}</Label><Input aria-label={`Nome do app ${app.name}`} maxLength={30} value={tile.apps?.[app.key]?.name ?? display.name} onChange={event => updateApp(app.key, { name: event.target.value })} /></div>
            <div className="min-w-0 space-y-1"><Label>Tamanho</Label><Select value={String(display.labelPx)} onValueChange={value => updateApp(app.key, { labelPx: Number(value) })}><SelectTrigger aria-label={`Tamanho da fonte de ${app.name}`} className="h-9"><SelectValue /></SelectTrigger><SelectContent>{[10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32].map(px => <SelectItem key={px} value={String(px)}>{px} px</SelectItem>)}</SelectContent></Select></div>
            <AppNameColorChoice appName={app.name} value={display.colorKey} onChange={color => updateApp(app.key, { color })} />
          </div>; })}
        </div>
        <div className="space-y-1"><Label>Prévia do cabeçalho dos apps</Label><HeaderPreview tile={tile} appName="CRM" display={appDisplay(tile, "crm", 16)} /></div>
      </div>
      <div className="mt-6 space-y-3 border-t border-border pt-4">
        <p className="text-sm font-medium">Ícones da página principal</p>
        <div role="group" aria-label="Ajustes dos ícones da página principal" className="grid w-full max-w-5xl grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="min-w-0 space-y-1"><Label className="flex min-h-10 items-end pb-1">Fonte do nome</Label><Select value={String(tile.labelPx)} onValueChange={(v) => setTileDraft({ ...tile, labelPx: Number(v) })}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent>{[11, 12, 13, 14, 15, 16].map((n) => <SelectItem key={n} value={String(n)}>{n} px</SelectItem>)}</SelectContent></Select></div>
          <div className="min-w-0 space-y-1"><Label className="flex min-h-10 items-end pb-1">Ícone Desktop</Label>
            <div className="grid h-9 w-36 grid-cols-[2rem_5rem_2rem] items-center justify-items-center">
              <Button variant="outline" size="compactIcon" aria-label="Diminuir ícone Desktop" title="Diminuir ícone Desktop" disabled={tile.tilePct <= 70} onClick={() => setTileDraft({ ...tile, tilePct: tile.tilePct - 5 })}><Minus /></Button>
              <span className="w-20 text-center text-sm tabular-nums">{tile.tilePct}%</span>
              <Button variant="outline" size="compactIcon" aria-label="Aumentar ícone Desktop" title="Aumentar ícone Desktop" disabled={tile.tilePct >= 140} onClick={() => setTileDraft({ ...tile, tilePct: tile.tilePct + 5 })}><Plus /></Button>
            </div><p className="w-36 text-center text-xs tabular-nums text-muted-foreground">{Number((112 * tile.tilePct / 100).toFixed(1))} × {Number((112 * tile.tilePct / 100).toFixed(1))} px</p></div>
          <div className="min-w-0 space-y-1"><Label className="flex min-h-10 items-end pb-1">Ícone Mobile</Label><div className="grid h-9 w-36 grid-cols-[2rem_5rem_2rem] items-center justify-items-center">
            <Button variant="outline" size="compactIcon" aria-label="Diminuir ícone Mobile" title="Diminuir ícone Mobile" disabled={tile.mobileTilePct <= 70} onClick={() => setTileDraft({ ...tile, mobileTilePct: tile.mobileTilePct - 5 })}><Minus /></Button>
            <span className="w-20 text-center text-sm tabular-nums">{tile.mobileTilePct}%</span>
            <Button variant="outline" size="compactIcon" aria-label="Aumentar ícone Mobile" title="Aumentar ícone Mobile" disabled={tile.mobileTilePct >= 140} onClick={() => setTileDraft({ ...tile, mobileTilePct: tile.mobileTilePct + 5 })}><Plus /></Button>
          </div><p className="w-36 text-center text-xs tabular-nums text-muted-foreground">{Number((80 * tile.mobileTilePct / 100).toFixed(1))} × {Number((80 * tile.mobileTilePct / 100).toFixed(1))} px</p></div>
          <div className="min-w-0 space-y-1"><Label className="flex min-h-10 items-end pb-1">Símbolo Desktop</Label>
            <div className="grid h-9 w-36 grid-cols-[2rem_5rem_2rem] items-center justify-items-center">
              <Button variant="outline" size="compactIcon" aria-label="Diminuir símbolo Desktop" title="Diminuir símbolo Desktop" disabled={tile.iconPct <= 60} onClick={() => setTileDraft({ ...tile, iconPct: tile.iconPct - 5 })}><Minus /></Button>
              <span className="w-20 text-center text-sm tabular-nums">{tile.iconPct}%</span>
              <Button variant="outline" size="compactIcon" aria-label="Aumentar símbolo Desktop" title="Aumentar símbolo Desktop" disabled={tile.iconPct >= 140} onClick={() => setTileDraft({ ...tile, iconPct: tile.iconPct + 5 })}><Plus /></Button>
            </div></div>
          <div className="min-w-0 space-y-1"><Label className="flex min-h-10 items-end pb-1">Símbolo Mobile</Label><div className="grid h-9 w-36 grid-cols-[2rem_5rem_2rem] items-center justify-items-center">
            <Button variant="outline" size="compactIcon" aria-label="Diminuir símbolo Mobile" title="Diminuir símbolo Mobile" disabled={tile.mobileIconPct <= 60} onClick={() => setTileDraft({ ...tile, mobileIconPct: tile.mobileIconPct - 5 })}><Minus /></Button>
            <span className="w-20 text-center text-sm tabular-nums">{tile.mobileIconPct}%</span>
            <Button variant="outline" size="compactIcon" aria-label="Aumentar símbolo Mobile" title="Aumentar símbolo Mobile" disabled={tile.mobileIconPct >= 140} onClick={() => setTileDraft({ ...tile, mobileIconPct: tile.mobileIconPct + 5 })}><Plus /></Button>
          </div></div>
          {([['gapX', 'Espaçamento horizontal'], ['gapY', 'Espaçamento vertical']] as const).map(([key, label]) => <div key={key} className="min-w-0 space-y-1"><Label className="flex min-h-10 items-end pb-1">{label}</Label><div className="grid h-9 w-36 grid-cols-[2rem_5rem_2rem] items-center justify-items-center">
            <Button variant="outline" size="compactIcon" aria-label={`Diminuir ${label.toLowerCase()}`} title="Diminuir" disabled={tile[key] <= 8} onClick={() => setTileDraft({ ...tile, [key]: Math.max(8, tile[key] - 4) })}><Minus /></Button>
            <span className="w-20 text-center text-sm tabular-nums">{tile[key]} px</span>
            <Button variant="outline" size="compactIcon" aria-label={`Aumentar ${label.toLowerCase()}`} title="Aumentar" disabled={tile[key] >= 80} onClick={() => setTileDraft({ ...tile, [key]: Math.min(80, tile[key] + 4) })}><Plus /></Button>
          </div></div>)}
        </div>
        <div className="max-w-xs space-y-2"><Label>Altura da faixa superior — Desktop</Label><Select value={String(tile.desktopHeaderPx ?? 0)} onValueChange={v => setTileDraft({ ...tile, desktopHeaderPx: Number(v) || undefined })}><SelectTrigger aria-label="Altura da faixa superior Desktop"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0">Atual (padrão)</SelectItem>{[80, 90, 100, 110, 120, 140, 160, 180, 200, 240].map(px => <SelectItem key={px} value={String(px)}>{px} px</SelectItem>)}</SelectContent></Select></div>
        <p className="pt-2 text-sm font-medium">Cores da página principal (Manual da Marca myio)</p>
        <div role="group" aria-label="Cores da página principal" className="grid w-full max-w-5xl grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-5">
          {COLOR_FIELDS.map(([kind, label]) => <ColorChoice key={kind} kind={kind} label={label} value={tile[kind]} onChange={(v) => setTileDraft({ ...tile, [kind]: v })} />)}
        </div>
        {appTileLowContrast(tile) && <p className="text-xs text-destructive">O texto abaixo dos ícones fica pouco visível neste fundo; escolha uma cor de texto contrastante.</p>}
        <div className="space-y-1"><Label>Prévia desktop</Label>
          <HeaderPreview tile={tile} />
          <div aria-label="Prévia dos apps" style={{ columnGap: tile.gapX, rowGap: tile.gapY, ...appTileColorVars(tile) } as React.CSSProperties} className="flex w-full flex-wrap bg-[var(--portal-bg)] px-4 py-10 sm:py-14">
            {order.map((key) => { const app = PORTAL_APPS.find((a) => a.key === key); return app ? <div key={key} style={{ zoom: tile.tilePct / 100 }} className="flex w-28 min-w-0 flex-col items-center text-center">
              <div className="relative flex h-28 w-28 flex-col items-center justify-between rounded-3xl border-2 border-[color:var(--tile-border)] bg-[var(--tile-fill)] px-2 pb-2 pt-1.5 text-primary-foreground"><AppTileFace appKey={key} name={app.name} tile={tile} /></div>
              <p className="mt-3 w-28 max-w-full break-words text-center text-sm leading-5 text-[color:var(--tile-below)]">{APP_DESCRIPTIONS[key]?.map(line => <span key={line} className="block">{line}</span>)}</p>
            </div> : null; })}
          </div></div>
        <div className="space-y-1"><Label>Prévia mobile</Label>
          <div className="w-full max-w-[390px]"><HeaderPreview tile={tile} mobile /></div>
          <div aria-label="Prévia mobile dos apps" style={{ ...appTileColorVars(tile), ...mobileTileVars(tile) } as React.CSSProperties} className="mobile-app-grid grid w-full max-w-[390px] bg-[var(--portal-bg)] px-3 py-8">
            {order.map(key => { const app = PORTAL_APPS.find(a => a.key === key); return app ? <div key={key} className="flex min-w-0 flex-col items-center text-center">
              <div className="mobile-app-tile relative flex flex-col items-center justify-between rounded-2xl border-2 border-[color:var(--tile-border)] bg-[var(--tile-fill)] px-1 pb-2 pt-1 text-primary-foreground"><AppTileFace appKey={key} name={app.name} tile={tile} mobile /></div>
              <p className="mt-2 w-full break-words text-center text-[0.68rem] leading-4 text-[color:var(--tile-below)]">{APP_DESCRIPTIONS[key]?.map(line => <span key={line} className="block">{line}</span>)}</p>
            </div> : null; })}
          </div>
        </div>
        <CdeMobileDockStyle />
        <p className="text-xs text-muted-foreground">No celular, a fonte fica 2 px menor. Os símbolos mais finos recebem correção automática para parecerem do mesmo tamanho.</p>
        <div className="flex items-center gap-2"><Button variant="action" aria-label="Salvar Home Page" title="Salvar Home Page" onClick={saveTile} disabled={saving || !tileDraft}><Save className="h-4 w-4" />Salvar</Button>
          {tileDraft && <Button variant="action" disabled={saving} onClick={() => setTileDraft(null)}>Cancelar</Button>}
        </div>
      </div></div>}
  </section>;
}
