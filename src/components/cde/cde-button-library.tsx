import { useState, type ReactNode } from "react";
import { Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CdeCategoryHeader } from "./cde-category-header";
import { CdeButton, type CdeGroup } from "./cde-button";
import { ICONS } from "./cde-render";
import { detectButtonGroup } from "./cde-look";
import library from "./button-library.json";

const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export type LibraryButton = (typeof library)[number];
export function CdeButtonLibrary({ number, handle, onEdit }: { number: number; handle?: ReactNode; onEdit: (button: LibraryButton, group?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = library.filter(b => normalize(`${b.label} ${b.file}`).includes(normalize(search)));
  return <section className="min-w-0 space-y-4">
    <CdeCategoryHeader number={number} handle={handle} title="Biblioteca de botões em uso" hint={`${library.length} usos`} open={open} onToggle={() => setOpen(!open)} />
    {open && <>
      <div className="relative max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar botão pelo nome" placeholder="Buscar botão pelo nome…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <p className="text-xs text-muted-foreground">{filtered.length} usos encontrados</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((b, index) => {
          const Icon = ICONS[b.icon];
          const options = b.label.split(" / ");
          const label = options.find(s => search.trim() && normalize(s).includes(normalize(search))) || options.find(s => !/\.\.\.|…/.test(s)) || options[0];
          const group = b.group || detectButtonGroup(<>{Icon && <Icon />}{label}</>);
          const content = <>{Icon && <Icon className="h-4 w-4" />}{label}</>;
          return <article key={`${b.file}:${b.line}:${index}`} className="grid h-20 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1 rounded-md border border-border bg-card p-2">
            <div className="flex min-w-0 items-center justify-center overflow-auto [&_button]:max-w-full [&_button]:whitespace-normal" inert>
              {b.tag === "CdeButton" && b.group ? <CdeButton group={b.group as CdeGroup} screen={b.file}>{label === b.icon ? null : label}</CdeButton> : b.tag === "button" ? <button type="button" className={b.className}>{content}</button> : <Button type="button" variant={(b.variant || undefined) as never} size={(b.size || undefined) as never} className={b.className}>{content}</Button>}
            </div>
            <Button type="button" variant="ghost" size="compactIcon" className="shrink-0" title={`Editar ${label}`} aria-label={`Editar ${label}`} onClick={() => onEdit(b, group)}><Pencil /></Button>
            <p className="col-span-2 truncate text-xs text-muted-foreground" title={`${b.label}\n${group ? `CDE: ${group}` : "Sem grupo de ação identificado"}\n${b.file}:${b.line}`}>{b.file.split("/").at(-1)}:{b.line} · {b.label}</p>
          </article>;
        })}
      </div>
      {!filtered.length && <p className="text-sm text-muted-foreground">Nenhum botão encontrado.</p>}
    </>}
  </section>;
}