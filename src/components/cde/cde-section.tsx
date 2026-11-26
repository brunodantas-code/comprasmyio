import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Internal configuration group; top-level category titles remain outside. */
export function CdeSection({ title, hint, marker, actions, children, className, open = true }: {
  title: string;
  hint?: string;
  marker?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  open?: boolean;
}) {
  return <section aria-label={title} className={cn("cde-section", className)}>
    <header className="cde-section-header grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="min-w-0">
        <h3 className="cde-section-title flex min-w-0 items-center gap-3">{marker && <span className="shrink-0">{marker}</span>}<span className="min-w-0 break-words">{title}</span></h3>
        {hint && <p className="cde-sub-hint mt-1">{hint}</p>}
      </div>
      {actions && <div className="cde-header-actions">{actions}</div>}
    </header>
    {open && <div className="cde-section-content min-w-0 space-y-4">{children}</div>}
  </section>;
}