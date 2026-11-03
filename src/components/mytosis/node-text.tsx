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
  return <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", verticalAlign === "top" ? "justify-start" : verticalAlign === "bottom" ? "justify-end" : "justify-center")} style={{ textAlign: align }}>
    <p data-mytosis-title className={cn("shrink-0 break-words font-semibold leading-tight", description ? "line-clamp-1" : "line-clamp-2")} style={{ fontSize: `${titleSize}px`, color: titleColorOf(titleColor, fillKey) }}>{title}</p>
    {description ? <p className="line-clamp-1 shrink-0 break-words font-normal leading-tight text-muted-foreground" style={{ fontSize: `${descriptionSize}px` }} title={description}>{description}</p> : null}
  </div>;
}