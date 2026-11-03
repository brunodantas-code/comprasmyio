import { cn } from "@/lib/utils";
import { titleColorOf } from "./title-colors";

type Props = {
  title: string;
  description: string | null;
  titleSize?: number;
  descriptionSize?: number;
  align?: "left" | "center" | "right";
  verticalAlign?: "top" | "center" | "bottom";
  titleColor?: string | null;
  fillKey?: string | null;
};

export function NodeText({ title, description, titleSize = 18, descriptionSize = 11, align = "left", verticalAlign = "center", titleColor, fillKey }: Props) {
  return <div className={cn("flex min-w-0 flex-1 shrink-0 flex-col", verticalAlign === "top" ? "justify-start" : verticalAlign === "bottom" ? "justify-end" : "justify-center")} style={{ textAlign: align }}>
    <p data-mytosis-title className="shrink-0 break-words font-semibold leading-tight [overflow-wrap:anywhere]" style={{ fontSize: `${titleSize}px`, color: titleColorOf(titleColor, fillKey) }}>{title}</p>
    {description ? <p className="shrink-0 break-words font-normal leading-tight text-muted-foreground [overflow-wrap:anywhere]" style={{ fontSize: `${descriptionSize}px` }} title={description}>{description}</p> : null}
  </div>;
}