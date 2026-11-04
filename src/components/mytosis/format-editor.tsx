import { AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { BoxFormat } from "@/lib/mytosis-format";
import { BORDERS, FILLS, SHAPES, ShapeSvg, type ShapeKey } from "./shapes";
import { ColorOptions } from "./color-options";
import type { TitleColorKey } from "./title-colors";

export function FormatEditor({ value, onChange }: { value: BoxFormat; onChange: (next: BoxFormat) => void }) {
  const set = <K extends keyof BoxFormat>(key: K, v: BoxFormat[K]) => onChange({ ...value, [key]: v });
  return <div className="grid gap-3">
    <div className="grid gap-1"><Label className="text-xs text-muted-foreground">Forma</Label>
      <div className="flex flex-wrap gap-1.5">{SHAPES.map((s) => (
        <button key={s.key} type="button" title={s.label} aria-label={s.label} aria-pressed={value.shape === s.key} onClick={() => set("shape", s.key)} className={cn("flex w-16 flex-col items-center justify-center gap-0.5 rounded-md border bg-card px-1 py-1.5 transition-colors", value.shape === s.key ? "border-primary bg-primary/10" : "border-border hover:border-primary/60")}>
          <ShapeSvg shape={s.key as ShapeKey} fill="transparent" stroke="var(--foreground)" className="h-5 w-8" />
          <span className="w-full truncate text-center text-[10px] leading-tight text-muted-foreground">{s.label}</span>
        </button>))}</div>
    </div>
    <div className="grid items-start gap-3 sm:grid-cols-2">
      <div className="grid gap-1"><Label className="text-xs text-muted-foreground">Fundo</Label>
        <div className="flex flex-wrap gap-1.5">{FILLS.map((f) => <button key={f.key} type="button" title={f.label} aria-label={`Fundo ${f.label}`} aria-pressed={value.fill_color === f.key} onClick={() => set("fill_color", f.key)} className={cn("h-7 w-7 rounded-full border border-border", value.fill_color === f.key && "ring-2 ring-primary ring-offset-1")} style={{ background: f.color }} />)}</div>
      </div>
      <div className="grid gap-1"><Label className="text-xs text-muted-foreground">Borda</Label>
        <div className="flex flex-wrap gap-1.5">{BORDERS.map((b) => <button key={b.key} type="button" title={b.label} aria-label={`Borda ${b.label}`} aria-pressed={value.border_color === b.key} onClick={() => set("border_color", b.key)} className={cn("h-7 w-7 rounded-full border-[3px] bg-card", value.border_color === b.key && "ring-2 ring-primary ring-offset-1")} style={{ borderColor: b.color }} />)}</div>
      </div>
    </div>
    <ColorOptions label="Cor do título" value={value.title_color as TitleColorKey | null} onChange={(v) => set("title_color", v)} />
    <ColorOptions label="Cor dos botões e setas" value={value.control_color as TitleColorKey | null} onChange={(v) => set("control_color", v)} defaultLabel="Padrão" />
    <div className="grid grid-cols-2 gap-3">
      <div className="grid gap-1.5"><Label htmlFor="default-title-size">Fonte do título (px)</Label><Input id="default-title-size" type="number" min={10} max={32} value={value.title_font_size} onChange={(e) => set("title_font_size", Number(e.target.value))} /></div>
      <div className="grid gap-1.5"><Label htmlFor="default-description-size">Fonte da descrição (px)</Label><Input id="default-description-size" type="number" min={10} max={32} value={value.description_font_size} onChange={(e) => set("description_font_size", Number(e.target.value))} /></div>
    </div>
    <div className="flex flex-wrap gap-5">
      <div className="grid gap-1.5"><Label className="text-xs text-muted-foreground">Alinhamento horizontal</Label><div className="flex gap-1">{([
        { v: "left", label: "À esquerda", Icon: AlignLeft }, { v: "center", label: "Centralizado", Icon: AlignCenter }, { v: "right", label: "À direita", Icon: AlignRight },
      ] as const).map(({ v, label, Icon }) => <Button key={v} type="button" variant="outline" size="icon" title={label} aria-label={label} aria-pressed={value.text_align === v} onClick={() => set("text_align", v)} className={cn(value.text_align === v && "!bg-primary !text-primary-foreground")}><Icon className="h-4 w-4" /></Button>)}</div></div>
      <div className="grid gap-1.5"><Label className="text-xs text-muted-foreground">Alinhamento vertical</Label><div className="flex gap-1">{([
        { v: "top", label: "Superior", Icon: AlignStartVertical }, { v: "center", label: "Centro vertical", Icon: AlignCenterVertical }, { v: "bottom", label: "Inferior", Icon: AlignEndVertical },
      ] as const).map(({ v, label, Icon }) => <Button key={v} type="button" variant="outline" size="icon" title={label} aria-label={label} aria-pressed={value.text_vertical_align === v} onClick={() => set("text_vertical_align", v)} className={cn(value.text_vertical_align === v && "!bg-primary !text-primary-foreground")}><Icon className="h-4 w-4" /></Button>)}</div></div>
    </div>
  </div>;
}
