import { ChevronLeft, ChevronDown, Plus, Trash2 } from "lucide-react";
import { MytosisIcon } from "@/components/mytosis-icon";
import { borderOf, fillOf, type ShapeKey } from "./shapes";
import { NodeText } from "./node-text";
import { NodeFrame } from "./node-frame";

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
      <div role="img" aria-label="Prévia da etapa" data-control-color={props.controlColor ?? "green"} className="mytosis-controls relative flex text-foreground" style={{ width: props.width }}>
        <NodeFrame shape={props.shape} height={props.height} fill={fill.color} stroke={borderOf(props.borderKey).color} fillKey={props.fillKey} progress={props.process ? undefined : 0} controlColor={props.controlColor}
          header={<div className="flex min-w-0 items-center justify-between gap-2 text-[11px] text-muted-foreground"><span className="inline-flex min-h-5 shrink-0 items-center justify-center rounded-md bg-primary/10 px-1.5 text-primary">{props.number}</span><div data-mytosis-control className="flex shrink-0 items-center gap-1"><MytosisIcon className="h-5 w-5" /><Trash2 className="h-3 w-3" /></div></div>}
          footer={<div className="flex min-w-0 items-center justify-between gap-2 text-[11px] text-muted-foreground"><span className="truncate">{props.responsible || "—"}</span><div className="flex shrink-0 items-center gap-1"><ChevronLeft data-mytosis-control className="size-4" /><ChevronDown data-mytosis-control className="size-4" /><Plus data-mytosis-control className="h-3.5 w-3.5" /></div></div>}>
          <NodeText title={props.title || "Nova etapa"} description={props.description || null} titleSize={props.titleSize} descriptionSize={props.descriptionSize} align={props.align} verticalAlign={props.verticalAlign} titleColor={props.titleColor} fillKey={props.fillKey} />
        </NodeFrame>
      </div>
    </div>
  </div>;
}