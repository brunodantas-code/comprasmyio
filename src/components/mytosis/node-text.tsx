import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
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
  const region = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const outer = region.current, inner = content.current;
    if (!outer || !inner) return;
    const fit = () => setScale(Math.min(1, outer.clientHeight / Math.max(1, inner.scrollHeight), outer.clientWidth / Math.max(1, inner.scrollWidth)));
    const observer = new ResizeObserver(fit);
    observer.observe(outer); observer.observe(inner); fit();
    return () => observer.disconnect();
  }, [title, description, titleSize, descriptionSize]);
  return <div ref={region} data-mytosis-text className={cn("flex min-h-0 min-w-0 flex-1 flex-col", verticalAlign === "top" ? "justify-start" : verticalAlign === "bottom" ? "justify-end" : "justify-center")} style={{ textAlign: align }}>
    <div ref={content} className="w-full shrink-0" style={{ transform: `scale(${scale})`, transformOrigin: `${align} ${verticalAlign === "top" ? "top" : verticalAlign === "bottom" ? "bottom" : "center"}` }}>
    <p data-mytosis-title className="shrink-0 break-words font-semibold leading-tight [overflow-wrap:anywhere]" style={{ fontSize: `${titleSize}px`, color: titleColorOf(titleColor, fillKey) }}>{title}</p>
    {description ? <p className="shrink-0 break-words font-normal leading-tight text-muted-foreground [overflow-wrap:anywhere]" style={{ fontSize: `${descriptionSize}px` }} title={description}>{description}</p> : null}
    </div>
  </div>;
}