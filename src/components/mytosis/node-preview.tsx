import { ChevronLeft, ChevronDown, Plus, Trash2 } from "lucide-react";
import { MytosisIcon } from "@/components/mytosis-icon";
import { cn } from "@/lib/utils";
import { ShapeSvg, borderOf, fillOf, shapeInset, type ShapeKey } from "./shapes";
import { NodeText } from "./node-text";

type Props = {
  width: number; height: number; shape: ShapeKey; fillKey: string; borderKey: string;
  title: string; description: string; responsible: string; number: string;
  titleSize: number; descriptionSize: number; titleColor: string | null;
  controlColor: string | null;
  align: "left" | "center" | "right"; verticalAlign: "top" | "center" | "bottom";
  process: boolean;
};

export function NodePreview(props: Props) {
  const fill = fillOf(props.fillKey);
  return <div className="grid gap-2">
    <span className="text-xs text-muted-foreground">Prévia</span>
    <div className="overflow-x-auto py-1">
      <div role="img" aria-label="Prévia da etapa" data-control-color={props.controlColor ?? "green"} className={cn("mytosis-controls relative flex overflow-hidden rounded-md text-foreground", fill.dark ? "text-mytosis-text-light [&_p:not([data-mytosis-title])]:!text-mytosis-text-light [&_span]:!text-mytosis-text-light" : fill.key === "purple-mid" ? "text-mytosis-text-dark [&_p:not([data-mytosis-title])]:!text-mytosis-text-dark [&_span]:!text-mytosis-text-dark" : "")} style={{ width: props.width, height: props.height }}>
        <ShapeSvg shape={props.shape} fill={fill.color} stroke={borderOf(props.borderKey).color} className="pointer-events-none absolute inset-0 h-full w-full" />
        {props.process ? null : <div className="relative w-1.5 shrink-0 bg-primary/10" />}
        <div className="relative flex min-w-0 flex-1 flex-col justify-between px-2.5 py-1.5" style={shapeInset[props.shape]}>
          <div className="flex shrink-0 items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex min-h-5 shrink-0 items-center justify-center rounded-md bg-primary/10 px-1.5 text-primary">{props.number}</span>
            <div className="flex items-center gap-1"><MytosisIcon data-mytosis-control className="h-5 w-5 shrink-0" /><Trash2 data-mytosis-control className="h-3 w-3 shrink-0" /></div>
          </div>
          <NodeText title={props.title || "Nova etapa"} description={props.description || null} titleSize={props.titleSize} descriptionSize={props.descriptionSize} align={props.align} verticalAlign={props.verticalAlign} titleColor={props.titleColor} fillKey={props.fillKey} />
          <div className="flex shrink-0 items-center justify-between gap-2 text-[11px] text-muted-foreground"><span className="truncate">{props.responsible || "—"}</span><div className="flex items-center gap-1"><ChevronLeft data-mytosis-control className="size-4" /><ChevronDown data-mytosis-control className="size-4" /><Plus data-mytosis-control className="h-3.5 w-3.5 shrink-0" /></div></div>
        </div>
      </div>
    </div>
  </div>;
}