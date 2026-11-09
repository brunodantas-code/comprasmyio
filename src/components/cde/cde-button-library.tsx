import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CdeCategoryHeader } from "./cde-category-header";
import { CdeButton, type CdeGroup } from "./cde-button";
import { ICONS } from "./cde-render";
import { detectButtonGroup } from "./cde-look";
import library from "./button-library.json";

const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function CdeButtonLibrary({ number, handle }: { number: number; handle?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const filtered = library.filter(b => normalize(`${b.label} ${b.file}`).includes(normalize(search)));
  const pages = Math.max(1, Math.ceil(filtered.length / 24));
  const current = Math.min(page, pages - 1);
  return <section className="min-w-0 space-y-4">
    <CdeCategoryHeader number={number} handle={handle} title="Biblioteca de botões em uso" hint={`${library.length} usos`} open={open} onToggle={() => setOpen(!open)} />
    {open && <>
      <div className="relative max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar botão pelo nome" placeholder="Buscar botão pelo nome…" className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></div>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{filtered.length} usos encontrados</span><span>Página {current + 1} de {pages}</span></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(current * 24, current * 24 + 24).map((b, index) => {
          const Icon = ICONS[b.icon];
          const options = b.label.split(" / ");
          const label = options.find(s => search.trim() && normalize(s).includes(normalize(search))) || options.find(s => !/\.\.\.|…/.test(s)) || options[0];
          const group = b.group || detectButtonGroup(label);
          const content = <>{Icon && <Icon className="h-4 w-4" />}{label}</>;
          return <article key={`${b.file}:${b.line}:${index}`} className="flex h-56 min-w-0 flex-col rounded-md border border-border bg-card p-3">
            <div className="flex h-20 shrink-0 items-center justify-center overflow-auto [&_button]:max-w-full [&_button]:whitespace-normal" inert>
              {b.tag === "CdeButton" && b.group ? <CdeButton group={b.group as CdeGroup} screen={b.file}>{label === b.icon ? null : label}</CdeButton> : b.tag === "button" ? <button type="button" className={b.className}>{content}</button> : <Button type="button" variant={(b.variant || undefined) as never} size={(b.size || undefined) as never} className={b.className}>{content}</Button>}
            </div>
            <p className="mt-2 line-clamp-2 text-sm" title={b.label}>{b.label}</p>
            <p className="mt-auto text-xs text-muted-foreground">{group ? `CDE: ${group}` : "Sem grupo de ação identificado"}{b.dynamic ? " · Texto variável" : ""}</p>
            <p className="mt-1 break-all text-xs text-muted-foreground" title={b.file}>{b.file}:{b.line}</p>
          </article>;
        })}
      </div>
      {!filtered.length && <p className="text-sm text-muted-foreground">Nenhum botão encontrado.</p>}
      <div className="flex justify-end gap-2"><Button variant="outline" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>Anterior</Button><Button variant="outline" size="sm" disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}>Próxima</Button></div>
    </>}
  </section>;
}