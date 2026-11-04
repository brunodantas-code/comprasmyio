import { AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { BoxFormat } from "@/lib/mytosis-format";

type TextFormat = Pick<BoxFormat, "title_font_size" | "description_font_size" | "text_align" | "text_vertical_align">;

export function TextFormatEditor({ value, onChange, idPrefix }: { value: TextFormat; onChange: (next: TextFormat) => void; idPrefix: string }) {
  const set = <K extends keyof TextFormat>(key: K, next: TextFormat[K]) => onChange({ ...value, [key]: next });
  return <div className="grid min-w-0 content-start gap-3">
    <div className="grid gap-1.5"><Label htmlFor={`${idPrefix}-title-size`} className="text-xs">Fonte do título (px)</Label><Input id={`${idPrefix}-title-size`} type="number" min={10} max={32} step={1} value={value.title_font_size} onChange={(e) => set("title_font_size", Number(e.target.value))} /></div>
    <div className="grid gap-1.5"><Label htmlFor={`${idPrefix}-description-size`} className="text-xs">Fonte da descrição (px)</Label><Input id={`${idPrefix}-description-size`} type="number" min={10} max={32} step={1} value={value.description_font_size} onChange={(e) => set("description_font_size", Number(e.target.value))} /></div>
    <div className="grid gap-1.5"><Label className="text-xs text-muted-foreground">Alinhamento horizontal</Label><div className="flex gap-1">{([
      { v: "left", label: "À esquerda", Icon: AlignLeft }, { v: "center", label: "Centralizado", Icon: AlignCenter }, { v: "right", label: "À direita", Icon: AlignRight },
    ] as const).map(({ v, label, Icon }) => <Button key={v} type="button" variant="outline" size="icon" title={label} aria-label={label} aria-pressed={value.text_align === v} onClick={() => set("text_align", v)} className={cn("h-7 w-7", value.text_align === v && "!bg-primary !text-primary-foreground")}><Icon className="size-3.5" /></Button>)}</div></div>
    <div className="grid gap-1.5"><Label className="text-xs text-muted-foreground">Alinhamento vertical</Label><div className="flex gap-1">{([
      { v: "top", label: "Superior", Icon: AlignStartVertical }, { v: "center", label: "Centro vertical", Icon: AlignCenterVertical }, { v: "bottom", label: "Inferior", Icon: AlignEndVertical },
    ] as const).map(({ v, label, Icon }) => <Button key={v} type="button" variant="outline" size="icon" title={label} aria-label={label} aria-pressed={value.text_vertical_align === v} onClick={() => set("text_vertical_align", v)} className={cn("h-7 w-7", value.text_vertical_align === v && "!bg-primary !text-primary-foreground")}><Icon className="size-3.5" /></Button>)}</div></div>
  </div>;
}