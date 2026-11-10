import { useMemo, useState, type ReactNode } from "react";
import { CdeDisclosureIcon } from "@/components/cde/cde-button";
import { cn } from "@/lib/utils";
import { AppSymbol } from "@/components/cde/app-tile";
import { Button } from "@/components/ui/button";

export type PendingGroupItem = { key: string; app: string; requester: string; count: number; row: ReactNode };
type GroupBy = "app" | "requester";

/** Groups pending rows by app or requester, with a red total and collapsible content. */
export function PendingGroups({ items }: { items: PendingGroupItem[] }) {
  const [groupBy, setGroupBy] = useState<GroupBy>("app");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const groups = useMemo(() => {
    const map = new Map<string, PendingGroupItem[]>();
    for (const item of items) { const k = groupBy === "app" ? item.app : item.requester; map.set(k, [...(map.get(k) ?? []), item]); }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [items, groupBy]);
  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  return <div className="space-y-2">
    <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
      <span>Agrupar por</span>
      {([["app", "App"], ["requester", "Solicitante"]] as const).map(([value, label]) => (
        <Button key={value} type="button" variant="ghost" size="sm" aria-pressed={groupBy === value} onClick={() => { setGroupBy(value); setOpen(new Set()); }} className={cn("h-8 w-28 border-0 px-2 text-center shadow-none", groupBy === value ? "font-semibold underline underline-offset-4" : "font-normal")}>{label}</Button>
      ))}
    </div>
    <div className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
      {groups.map(([name, rows]) => {
        const isOpen = open.has(name);
        const total = rows.reduce((s, r) => s + r.count, 0);
        return <div key={name}>
          <div className="transition-colors hover:bg-primary/10 focus-within:bg-primary/10"><button type="button" onClick={() => toggle(name)} aria-expanded={isOpen} className="!flex !w-full !max-w-none items-center gap-3 !bg-transparent px-4 py-3 text-left">
            <CdeDisclosureIcon open={isOpen} screen="components/pending-groups.tsx" />
            {groupBy === "app" ? <AppSymbol name={name} className="h-5 w-5 shrink-0 text-foreground" /> : null}
            <span className="min-w-0 flex-1 text-sm font-semibold">{name}</span>
            <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-destructive px-2 text-xs font-bold text-destructive-foreground">{total > 99 ? "99+" : total}</span>
          </button></div>
          {isOpen ? <div className="divide-y divide-border border-t border-border bg-muted/30">{rows.map((r) => <div key={r.key} className="pl-8 transition-colors hover:bg-primary/10 focus-within:bg-primary/10 [&>a]:!bg-transparent">{r.row}</div>)}</div> : null}
        </div>;
      })}
    </div>
  </div>;
}
