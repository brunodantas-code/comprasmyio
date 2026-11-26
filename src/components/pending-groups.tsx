import { AlertMarker, NumericMarker } from "@/components/cde/numeric-markers";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { CdeDisclosureIcon } from "@/components/cde/cde-button";
import { cn } from "@/lib/utils";
import { AppSymbol } from "@/components/cde/app-tile";
import { Button } from "@/components/ui/button";
import { Bell, ListFilter } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";

export type PendingGroupItem = { key: string; app: string; requester: string; count: number; row: ReactNode };
type GroupBy = "app" | "requester";

/**
 * Row content shared by every pending list: the numeric identifier sits above the
 * app symbol in a fixed-width column, so the text always starts at the same left edge.
 */
export function PendingRowContent({ icon: Icon, label, number, destructive }: {
  icon: ComponentType<{ className?: string }>;
  label: ReactNode;
  number?: string | number;
  destructive?: boolean;
}) {
  return <>
    <span className="flex w-5 shrink-0 flex-col items-center gap-1">
      {number !== undefined ? <NumericMarker>{number}</NumericMarker> : null}
      <Icon className={cn("h-5 w-5 shrink-0", destructive && "text-destructive")} />
    </span>
    <span className="min-w-0 flex-1 text-left text-sm font-medium">{label}</span>
  </>;
}

/** Groups pending rows by app or requester, with a red total and collapsible content. */
export function PendingGroups({ items, leading }: { items: PendingGroupItem[]; leading?: ReactNode }) {
  const [groupBy, setGroupBy] = useState<GroupBy>("app");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const groups = useMemo(() => {
    const map = new Map<string, PendingGroupItem[]>();
    for (const item of items) { const k = groupBy === "app" ? item.app : item.requester; map.set(k, [...(map.get(k) ?? []), item]); }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [items, groupBy]);
  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const changeGroup = (value: GroupBy) => { setGroupBy(value); setOpen(new Set()); };
  return <div className="overflow-hidden rounded-md border border-border bg-card">
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border p-4 sm:flex sm:justify-between">
      <h2 id="pending-title" className="flex min-w-0 items-center gap-2 text-xl font-bold"><Bell className="h-5 w-5 shrink-0" /><span className="min-w-0 break-words">Minhas pendências</span></h2>
      <div className="sm:hidden"><DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="compactIcon" aria-label="Agrupar pendências" title="Agrupar por"><ListFilter /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuRadioGroup value={groupBy} onValueChange={value => { if (value === "app" || value === "requester") changeGroup(value); }}><DropdownMenuRadioItem value="app">App</DropdownMenuRadioItem><DropdownMenuRadioItem value="requester">Solicitante</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu></div>
    <div className="hidden shrink-0 items-center justify-end gap-2 text-xs text-muted-foreground sm:flex">
      <span>Agrupar por</span>
      {([["app", "App"], ["requester", "Solicitante"]] as const).map(([value, label]) => (
        <Button key={value} type="button" variant="ghost" size="sm" aria-pressed={groupBy === value} onClick={() => changeGroup(value)} className={cn("h-8 w-28 border-0 px-2 text-center shadow-none", groupBy === value ? "font-semibold underline underline-offset-4" : "font-normal")}>{label}</Button>
      ))}
    </div>
    </header>
    <div className="divide-y divide-border">
      {leading}
      {groups.map(([name, rows]) => {
        const isOpen = open.has(name);
        const total = rows.reduce((s, r) => s + r.count, 0);
        return <div key={name}>
          <div className="transition-colors hover:bg-primary/10 focus-within:bg-primary/10"><Button variant="ghost" type="button" onClick={() => toggle(name)} aria-expanded={isOpen} className="!flex !h-auto !min-w-0 !w-full !max-w-none !justify-start items-center gap-3 !bg-transparent px-4 py-3 text-left">
            {groupBy === "app" ? <AppSymbol name={name} className="h-5 w-5 shrink-0 text-foreground" /> : <span aria-hidden className="h-5 w-5 shrink-0" />}
            <span className="min-w-0 flex-1 break-words text-sm font-semibold">{name}</span>
            <span className="ml-auto flex shrink-0 items-center gap-3"><AlertMarker count={total} /><CdeDisclosureIcon open={isOpen} screen="components/pending-groups.tsx" /></span>
          </Button></div>
          {isOpen ? <div className="divide-y divide-border border-t border-border bg-muted/30">{rows.map((r) => <div key={r.key} className="transition-colors hover:bg-primary/10 focus-within:bg-primary/10 [&>a]:!bg-transparent">{r.row}</div>)}</div> : null}
        </div>;
      })}
    </div>
  </div>;
}
