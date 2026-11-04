import type { ReactNode } from "react";
import { TextFormatEditor } from "./text-format-editor";
import { FormatColorOptions } from "./format-color-options";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { BoxFormat } from "@/lib/mytosis-format";
import { BORDERS, FILLS, SHAPES, ShapeSvg, type ShapeKey } from "./shapes";
import { ColorOptions } from "./color-options";
import type { TitleColorKey } from "./title-colors";

export function FormatEditor({ value, onChange, preview }: { value: BoxFormat; onChange: (next: BoxFormat) => void; preview: ReactNode }) {
  const set = <K extends keyof BoxFormat>(key: K, v: BoxFormat[K]) => onChange({ ...value, [key]: v });
  return <div className="grid gap-3">
    <div className="grid min-w-0 items-start gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
      <div className="min-w-0">{preview}</div>
      <TextFormatEditor idPrefix="default" value={value} onChange={(next) => onChange({ ...value, ...next })} />
    </div>
    <div className="grid gap-1"><Label className="text-xs text-muted-foreground">Forma</Label>
      <div className="flex flex-wrap gap-1.5">{SHAPES.map((s) => (
        <button key={s.key} type="button" title={s.label} aria-label={s.label} aria-pressed={value.shape === s.key} onClick={() => set("shape", s.key)} className={cn("flex w-16 flex-col items-center justify-center gap-0.5 rounded-md border bg-card px-1 py-1.5 transition-colors", value.shape === s.key ? "border-primary bg-primary/10" : "border-border hover:border-primary/60")}>
          <ShapeSvg shape={s.key as ShapeKey} fill="transparent" stroke="var(--foreground)" className="h-5 w-8" />
          <span className="w-full truncate text-center text-[10px] leading-tight text-muted-foreground">{s.label}</span>
        </button>))}</div>
    </div>
    <div className="grid items-start gap-3 sm:grid-cols-2">
      <FormatColorOptions label="Fundo" value={value.fill_color} options={FILLS} onChange={(v) => set("fill_color", v)} />
      <FormatColorOptions label="Borda" value={value.border_color} options={BORDERS} onChange={(v) => set("border_color", v)} border />
    </div>
    <ColorOptions label="Cor do título" value={value.title_color as TitleColorKey | null} onChange={(v) => set("title_color", v)} />
    <ColorOptions label="Cor dos botões e setas" value={value.control_color as TitleColorKey | null} onChange={(v) => set("control_color", v)} defaultLabel="Padrão" />
  </div>;
}
