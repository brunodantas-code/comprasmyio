import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ShapeSvg, shapeContentInset, shapeExternalChrome, type ShapeKey } from "./shapes";

/** Shared geometry for the editor preview and live canvas. */
export function NodeFrame({ shape, height, fill, stroke, fillKey, strokeWidth = 1, header, footer, children, progress, collapsed = false, controlColor }: {
  shape: ShapeKey; height: number; fill: string; stroke: string; fillKey: string;
  strokeWidth?: number; header: ReactNode; footer: ReactNode; children: ReactNode;
  progress?: number; collapsed?: boolean; controlColor?: string | null;
}) {
  const external = shapeExternalChrome(shape) && !collapsed;
  const contrast = fillKey === "purple" || fillKey === "dark"
    ? "text-mytosis-text-light [&_p:not([data-mytosis-title])]:!text-mytosis-text-light [&_span]:!text-mytosis-text-light"
    : fillKey === "purple-mid" ? "text-mytosis-text-dark [&_p:not([data-mytosis-title])]:!text-mytosis-text-dark [&_span]:!text-mytosis-text-dark" : "text-foreground";
  const chrome = (content: ReactNode) => <div data-control-color={controlColor === "white" ? "black" : controlColor ?? "green"} className="mytosis-controls relative z-10 min-w-0 px-2.5 py-1 text-muted-foreground">{content}</div>;
  return <div className="flex w-full min-w-0 flex-col">
    {external ? chrome(header) : null}
    <div data-mytosis-surface className={cn("relative flex min-w-0 flex-1", contrast)} style={{ minHeight: height }}>
      <ShapeSvg shape={shape} fill={fill} stroke={stroke} strokeWidth={strokeWidth} className="pointer-events-none absolute inset-0 h-full w-full" />
      <div className="relative flex min-w-0 flex-1 flex-col justify-between gap-2 px-3 py-2" style={collapsed ? undefined : shapeContentInset(shape, height)}>
        {!external && !collapsed ? header : null}
        {children}
        {!external && !collapsed ? footer : null}
      </div>
    </div>
    {external ? chrome(footer) : null}
    {progress !== undefined && !collapsed ? <div className="mx-3 mt-1 h-1 overflow-hidden bg-primary/10" aria-label={`${progress}% concluído`}><div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${progress}%` }} /></div> : null}
  </div>;
}