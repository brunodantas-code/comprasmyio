import { ChevronDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { CdeNumber } from "./cde-button";

/** Top-level categories stay unframed; green bands belong to subcategories. */
export function CdeCategoryHeader({ number, title, hint, open, onToggle, action }: {
  number: ReactNode;
  title: string;
  hint?: string;
  open?: boolean;
  onToggle?: () => void;
  action?: ReactNode;
}) {
  const content = <>
    <CdeNumber>{number}</CdeNumber>
    <span className="flex min-w-0 flex-1 items-baseline gap-3"><span className="shrink-0 text-lg font-semibold">{title}</span>
      {hint && <span className="min-w-0 truncate text-xs font-normal text-muted-foreground" title={hint}>{hint}</span>}
    </span>
    {onToggle && (open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />)}
  </>;
  return <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
    {onToggle ? <Button variant="ghost" aria-expanded={open} onClick={onToggle} className="h-auto min-w-0 flex-1 justify-start gap-3 rounded-none p-0 text-left hover:bg-transparent">{content}</Button>
      : <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>}
    {action}
  </div>;
}