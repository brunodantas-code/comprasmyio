import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AccessStatusFilter = "all" | "active" | "inactive";

const TABS: Array<{ key: AccessStatusFilter; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "active", label: "Ativos" },
  { key: "inactive", label: "Inativos" },
];

/**
 * Abas de situação usadas nas listas de usuários do Acessos: permite ver
 * somente os ativos ou somente os inativos, com a quantidade em cada uma.
 */
export function AccessStatusTabs({
  value,
  onChange,
  counts,
  className,
}: {
  value: AccessStatusFilter;
  onChange: (next: AccessStatusFilter) => void;
  counts: { all: number; active: number; inactive: number };
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)} role="tablist" aria-label="Situação dos usuários">
      {TABS.map((tab) => (
        <Button
          key={tab.key}
          type="button"
          variant="ghost"
          size="sm"
          role="tab"
          aria-selected={value === tab.key}
          className={cn(
            "h-auto rounded-none border-b-2 px-3 py-1.5 text-sm",
            value === tab.key ? "border-primary font-semibold" : "border-transparent text-muted-foreground",
          )}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          <span className="ml-1 text-xs text-muted-foreground">{counts[tab.key]}</span>
        </Button>
      ))}
    </div>
  );
}

/** Inativos sempre por último: mantém a ordem interna de cada grupo. */
export function putInactiveLast<T>(rows: readonly T[], isActive: (row: T) => boolean): T[] {
  const active: T[] = [];
  const inactive: T[] = [];
  for (const row of rows) (isActive(row) ? active : inactive).push(row);
  return [...active, ...inactive];
}
