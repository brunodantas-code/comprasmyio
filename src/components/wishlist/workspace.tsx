import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Lightbulb, MessageCircleMore, MessageCircleQuestion, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSortMenu, type TableSorting } from "@/components/table-sort-menu";
import { CdeButton } from "@/components/cde/cde-button";
import { useTableFilters } from "@/components/use-table-filters";
import { WISHLIST_STATUSES, unansweredWishlistQuestions, wishlistSummary } from "@/lib/wishlist";
import { wishlistOptions } from "./data";
import { WishlistIdeaDialog } from "./idea-dialog";

export function WishlistWorkspace({ userId }: { userId: string }) {
  const { data } = useSuspenseQuery(wishlistOptions(userId));
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<TableSorting | undefined>();
  const name = (id: string) => data.users.find(u => u.id === id)?.full_name || "Usuário";
  const status = (value: string) => WISHLIST_STATUSES[value as keyof typeof WISHLIST_STATUSES] ?? value;
  const pending = unansweredWishlistQuestions(data.messages);
  const filters = useTableFilters(data.ideas, [
    { key: "idealizer", label: "Idealizador", value: idea => name(idea.idealizer_id) },
    { key: "description", label: "Descrição", value: idea => `${idea.title} ${idea.description}` },
    { key: "status", label: "Situação", value: idea => status(idea.status) },
    { key: "date", label: "Data", kind: "date", value: idea => idea.created_at.slice(0, 10), display: idea => new Date(idea.created_at).toLocaleDateString("pt-BR") },
    { key: "question", label: "Mensagens", value: idea => pending.some(q => q.idea_id === idea.id && q.recipient_id === userId) ? "Aguardando minha resposta" : pending.some(q => q.idea_id === idea.id && q.author_id === userId) ? "Aguardando resposta" : "Sem mensagens para mim" },
  ]);
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const terms = normalize(search).trim().split(/\s+/).filter(Boolean);
  const shown = [...filters.filtered].filter(idea => terms.every(term => normalize(`${idea.title} ${idea.description} ${name(idea.idealizer_id)} ${status(idea.status)}`).includes(term))).sort((a, b) => sorting ? a.title.localeCompare(b.title, "pt-BR") * (sorting.direction === "desc" ? -1 : 1) : b.created_at.localeCompare(a.created_at))
  const selectedIdea = data.ideas.find(idea => idea.id === selected) ?? null;
  return <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="flex items-center gap-2 text-3xl font-extrabold"><Lightbulb className="h-8 w-8" />Wishlist</h1>
          <CdeButton group="plus" screen="components/wishlist/workspace.tsx" aria-label="Novo desejo" title="Novo desejo" onClick={() => setSelected("new")} />
        </div>
        <CardTitle>Desejos compartilhados</CardTitle>
        <CardDescription>{shown.length} desejos</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[length:var(--filter-fs)] erp-list-toolbar">
          {filters.menu}
          <TableSortMenu columns={[{ key: "title", label: "Desejo" }]} value={sorting} onChange={setSorting} />
          <div>
          <div className="erp-search-row grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2"><Search className="size-4 shrink-0 text-muted-foreground" /><Input aria-label="Buscar desejos" title="Buscar desejo, idealizador ou situação" placeholder="Buscar desejo" value={search} onChange={event => setSearch(event.target.value)} className="h-8 text-[length:var(--filter-fs)]" /><Button variant="ghost" size="compactIcon" aria-label="Limpar busca" title="Limpar busca" disabled={!search} onClick={() => setSearch("")}><X /></Button></div>
          </div>
        </div>
        {filters.summary}
        <Table>
          <TableHeader><TableRow><TableHead className="md:w-48">Idealizador</TableHead><TableHead className="md:w-28">Data</TableHead><TableHead>Desejo · Resumo da descrição</TableHead><TableHead className="md:w-32">Situação</TableHead><TableHead className="md:w-10"><span className="sr-only">Mensagens</span></TableHead></TableRow></TableHeader>
          <TableBody>{shown.map(idea => {
          const questionForMe = pending.some(q => q.idea_id === idea.id && q.recipient_id === userId);
          const waiting = pending.some(q => q.idea_id === idea.id && q.author_id === userId);
          return <TableRow key={idea.id} className="cursor-pointer" onClick={() => setSelected(idea.id)}>
            <TableCell className="text-xs">{name(idea.idealizer_id)}</TableCell>
            <TableCell className="text-xs"><time>{new Date(idea.created_at).toLocaleDateString("pt-BR")}</time></TableCell>
            <TableCell className="min-w-0"><div className="min-w-0"><Button cdeIgnore variant="link" className="h-auto max-w-full whitespace-normal p-0 text-left" aria-label={`Abrir desejo ${idea.title}`} onClick={event => { event.stopPropagation(); setSelected(idea.id); }}>{idea.title}</Button><span className="block text-xs font-normal text-muted-foreground">{wishlistSummary(idea.description)}</span></div></TableCell>
            <TableCell>{status(idea.status)}</TableCell><TableCell>{questionForMe ? <MessageCircleQuestion className="size-5 text-destructive" aria-label="Mensagem aguardando sua resposta" /> : waiting ? <MessageCircleMore className="size-5 text-muted-foreground" aria-label="Aguardando resposta" /> : null}</TableCell>
          </TableRow>;
        })}
        {!shown.length && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">{search || filters.active ? "Nenhum desejo nesta seleção." : "Nenhum desejo registrado."}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    {selected && <WishlistIdeaDialog key={selected} idea={selectedIdea} messages={data.messages} steps={data.steps} users={data.users} userId={userId} isAdmin={data.isAdmin} onClose={() => setSelected(null)} />}
  </main>;
}
