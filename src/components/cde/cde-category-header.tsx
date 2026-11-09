import { ChevronDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { CdeNumber, CdeToggleIcon } from "./cde-button";

/** Top-level categories stay unframed; green bands belong to subcategories. */
export function CdeCategoryHeader({ number, title, hint, open, onToggle, action, handle }: {
  handle?: ReactNode;
  number: ReactNode;
  title: string;
  hint?: string;
  open?: boolean;
  onToggle?: () => void;
  action?: ReactNode;
}) {
  const content = <>
    <CdeNumber>{number}</CdeNumber>
    <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1"><span className="min-w-0 break-words text-lg font-semibold">{title}</span>
      {hint && <span className="min-w-0 text-xs font-normal text-muted-foreground sm:truncate" title={hint}>{hint}</span>}
    </span>
    {onToggle && <CdeToggleIcon open={open} />}
  </>;
  return <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
    {handle}
    {onToggle ? <Button variant="ghost" aria-expanded={open} onClick={onToggle} className="h-auto min-w-0 flex-1 justify-start gap-3 rounded-none p-0 text-left hover:bg-transparent">{content}</Button>
      : <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>}
    {action}
  </div>;
}