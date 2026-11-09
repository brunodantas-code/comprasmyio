import { useState, type ReactNode } from "react";
import { ArrowUpDown, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTableFilters } from "@/components/use-table-filters";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CdeCategoryHeader } from "./cde-category-header";
import { CdeButton, type CdeGroup } from "./cde-button";
import { ICONS } from "./cde-render";
import { detectButtonGroup } from "./cde-look";
import library from "./button-library.json";

const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export type LibraryButton = (typeof library)[number];
export function CdeButtonLibrary({ number, handle, onEdit }: { number: number; handle?: ReactNode; onEdit: (button: LibraryButton, group?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState("name");
  const [direction, setDirection] = useState("asc");
  const typeOf = (b: LibraryButton) => b.group || detectButtonGroup(b.label) || b.tag;
  const filters = useTableFilters(library, [
    { key: "name", label: "Nome do botão", value: b => b.label },
    { key: "type", label: "Tipo / grupo CDE", value: typeOf },
    { key: "file", label: "Local de uso", value: b => b.file },
    { key: "icon", label: "Ícone", value: b => b.icon },
  ]);
  const search = filters.searchText("name");
  const filtered = [...filters.filtered].sort((a, b) => {
    const value = (entry: LibraryButton) => sort === "type" ? typeOf(entry) : sort === "file" ? entry.file : entry.label;
    return (direction === "desc" ? -1 : 1) * value(a).localeCompare(value(b), "pt-BR", { sensitivity: "base", numeric: true });
  });
  const saveUses = filtered.filter(b => typeOf(b) === "save");
  const deleteUses = filtered.filter(b => typeOf(b) === "trash");
  const cards = filtered.filter(b => (typeOf(b) !== "save" || b === saveUses[0]) && (typeOf(b) !== "trash" || b === deleteUses[0]));
  return <section className="min-w-0 space-y-4">
    <CdeCategoryHeader number={number} handle={handle} title="Biblioteca de botões em uso" hint={`${library.length} usos`} open={open} onToggle={() => setOpen(!open)} />
    {open && <>
      <div className="flex items-center gap-2">{filters.menu}<Popover><PopoverTrigger asChild><Button type="button" variant="ghost" size="compactIcon" aria-label="Ordenar botões" title="Ordenar botões"><ArrowUpDown /></Button></PopoverTrigger><PopoverContent align="start" className="w-64 space-y-3"><Select value={sort} onValueChange={setSort}><SelectTrigger aria-label="Ordenar por"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="name">Nome do botão</SelectItem><SelectItem value="type">Tipo / grupo CDE</SelectItem><SelectItem value="file">Local de uso</SelectItem></SelectContent></Select><Select value={direction} onValueChange={setDirection}><SelectTrigger aria-label="Sentido da ordenação"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="asc">A → Z</SelectItem><SelectItem value="desc">Z → A</SelectItem></SelectContent></Select></PopoverContent></Popover></div>
      <p className="text-xs text-muted-foreground">{filtered.length} usos encontrados</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((b, index) => {
          const Icon = ICONS[b.icon];
          const options = b.label.split(" / ");
          const label = options.find(s => search.trim() && normalize(s).includes(normalize(search))) || options.find(s => !/\.\.\.|…/.test(s)) || options[0];
          const group = b.group || detectButtonGroup(<>{Icon && <Icon />}{label}</>);
          const uses = group === "trash" ? deleteUses : saveUses;
          const content = <>{Icon && <Icon className="h-4 w-4" />}{label}</>;
          return <article key={`${b.file}:${b.line}:${index}`} className="grid h-20 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1 rounded-md border border-border bg-card p-2">
            <div className="relative isolate flex h-12 min-w-0 items-center justify-center overflow-hidden [contain:layout_paint] [&_button]:!static [&_button]:!m-0 [&_button]:!max-h-full [&_button]:!max-w-full [&_button]:!translate-x-0 [&_button]:!translate-y-0 [&_button]:!whitespace-normal [&_button]:!overflow-hidden" inert>
              {b.tag === "CdeButton" && b.group ? <CdeButton group={b.group as CdeGroup} screen={b.file}>{label === b.icon ? null : label}</CdeButton> : b.tag === "button" ? <button type="button" className={b.className}>{content}</button> : <Button type="button" variant={(b.variant || undefined) as never} size={(b.size || undefined) as never} className={b.className}>{content}</Button>}
            </div>
            <Button type="button" variant="ghost" size="compactIcon" className="shrink-0" title={`Editar ${label}`} aria-label={`Editar ${label}`} onClick={() => onEdit(b, group)}><Pencil /></Button>
            {group === "save" || group === "trash" ? <Popover><PopoverTrigger asChild><Button type="button" variant="ghost" size="sm" className="col-span-2 justify-start" aria-label={`Locais do botão ${group === "trash" ? "Excluir" : "Salvar"}`}><MapPin />{uses.length} locais de uso</Button></PopoverTrigger><PopoverContent className="max-h-80 w-96 max-w-[90vw] overflow-y-auto"><ul className="space-y-2">{uses.map((use, i) => <li key={`${use.file}:${use.line}:${i}`} className="break-words text-xs text-muted-foreground">{use.file}:{use.line} · {use.label}</li>)}</ul></PopoverContent></Popover> : <p className="col-span-2 truncate text-xs text-muted-foreground" title={`${b.label}\n${group ? `CDE: ${group}` : "Sem grupo de ação identificado"}\n${b.file}:${b.line}`}>{b.file.split("/").at(-1)}:{b.line} · {b.label}</p>}
          </article>;
        })}
      </div>
      {!filtered.length && <p className="text-sm text-muted-foreground">Nenhum botão encontrado.</p>}
    </>}
  </section>;
}