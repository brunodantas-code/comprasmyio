import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AccessUserRowProps = {
  name: string;
  email?: string | null;
  badges?: ReactNode;
  leading?: ReactNode;
  controls?: ReactNode;
  details?: ReactNode;
  inactive?: boolean;
  onNameClick?: () => void;
};

/** Shared Supply-style row for every app access editor. */
export function AccessUserRow({ name, email, badges, leading, controls, details, inactive = false, onNameClick }: AccessUserRowProps) {
  return (
    <div data-access-user-row className={cn("rounded-md border border-border bg-card", inactive && "opacity-60")}>
      <div className="grid min-h-[4.5rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3">
        <div className="flex min-w-0 items-center gap-2">
          {leading}
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              {onNameClick ? (
                <button type="button" onClick={onNameClick} className="min-w-0 truncate text-left text-sm font-medium">
                  {name}
                </button>
              ) : (
                <p className="min-w-0 truncate text-sm font-medium">{name}</p>
              )}
              {badges ? <div className="flex min-w-0 items-center gap-2 overflow-x-auto [&>*]:shrink-0">{badges}</div> : null}
            </div>
            <p className="truncate text-xs text-muted-foreground">{email || "—"}</p>
          </div>
        </div>
        {controls}
      </div>
      {details ? <div className="border-t border-border p-3">{details}</div> : null}
    </div>
  );
}
