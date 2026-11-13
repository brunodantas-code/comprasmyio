import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowDownAZ, ArrowUpAZ, Lightbulb, MessageCircleMore, MessageCircleQuestion, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CdeButton } from "@/components/cde/cde-button";
import { useTableFilters } from "@/components/use-table-filters";
import { WISHLIST_STATUSES, unansweredWishlistQuestions, wishlistSummary } from "@/lib/wishlist";
import { wishlistOptions } from "./data";
import { WishlistIdeaDialog } from "./idea-dialog";

export function WishlistWorkspace({ userId }: { userId: string }) {
  const { data } = useSuspenseQuery(wishlistOptions(userId));
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [alphabetical, setAlphabetical] = useState(false);
  const name = (id: string) => data.users.find(u => u.id === id)?.full_name || "Usuário";
  const status = (value: string) => WISHLIST_STATUSES[value as keyof typeof WISHLIST_STATUSES] ?? value;
  const pending = unansweredWishlistQuestions(data.messages);
  const filters = useTableFilters(data.ideas, [
    { key: "idealizer", label: "Idealizador", value: idea => name(idea.idealizer_id) },
    { key: "description", label: "Descrição", value: idea => `${idea.title} ${idea.description}` },
    { key: "status", label: "Situação", value: idea => status(idea.status) },
    { key: "date", label: "Data", kind: "date", value: idea => idea.created_at.slice(0, 10), display: idea => new Date(idea.created_at).toLocaleDateString("pt-BR") },
    { key: "question", label: "Perguntas", value: idea => pending.some(q => q.idea_id === idea.id && q.recipient_id === userId) ? "Aguardando minha resposta" : pending.some(q => q.idea_id === idea.id && q.author_id === userId) ? "Aguardando resposta" : "Sem perguntas para mim" },
  ]);
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const terms = normalize(search).trim().split(/\s+/).filter(Boolean);
  const shown = [...filters.filtered].filter(idea => terms.every(term => normalize(`${idea.title} ${idea.description} ${name(idea.idealizer_id)} ${status(idea.status)}`).includes(term))).sort((a, b) => alphabetical ? a.title.localeCompare(b.title, "pt-BR") : b.created_at.localeCompare(a.created_at));
  const selectedIdea = data.ideas.find(idea => idea.id === selected) ?? null;
  return <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><h1 className="flex items-center gap-2 text-2xl font-bold"><Lightbulb className="size-6" />Wishlist</h1><span className="text-sm text-muted-foreground">{shown.length} desejos</span></div>
      <div className="flex shrink-0 items-center gap-2">{filters.menu}<Button variant="ghost" size="compactIcon" aria-label="Ordenar desejos" title={alphabetical ? "Ordenar por mais recentes" : "Ordenar por título"} onClick={() => setAlphabetical(!alphabetical)}>{alphabetical ? <ArrowUpAZ /> : <ArrowDownAZ />}</Button><CdeButton group="plus" screen="components/wishlist/workspace.tsx" aria-label="Novo desejo" title="Novo desejo" onClick={() => setSelected("new")} /></div>
    </div>
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2"><Search className="size-4 text-muted-foreground" /><Input aria-label="Buscar desejos" placeholder="Buscar desejo, idealizador ou situação" value={search} onChange={event => setSearch(event.target.value)} /><Button variant="ghost" size="compactIcon" aria-label="Limpar busca" title="Limpar busca" disabled={!search} onClick={() => setSearch("")}><X /></Button></div>
    <section aria-label="Desejos compartilhados">
      <div className="hidden grid-cols-[12rem_6rem_minmax(0,1fr)_8rem_2rem] gap-4 border-b border-border px-3 py-2 text-xs text-muted-foreground md:grid"><span>Idealizador</span><span>Data</span><span>Desejo · Resumo da descrição</span><span>Situação</span><span /></div>
      <div className="divide-y divide-border">{shown.map(idea => {
        const questionForMe = pending.some(q => q.idea_id === idea.id && q.recipient_id === userId);
        const waiting = pending.some(q => q.idea_id === idea.id && q.author_id === userId);
        return <Button key={idea.id} cdeNative actionKind="specific" aria-label={`Abrir desejo ${idea.title}`} onClick={() => setSelected(idea.id)} className="grid h-auto w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 rounded-none bg-transparent px-3 py-3 text-left whitespace-normal text-foreground cursor-pointer hover:bg-cde-number-soft focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:grid-cols-[12rem_6rem_minmax(0,1fr)_8rem_2rem] md:gap-4">
          <span className="min-w-0 truncate text-xs text-muted-foreground md:text-sm md:text-foreground">{name(idea.idealizer_id)}</span>
          <time className="text-right text-xs text-muted-foreground md:text-left">{new Date(idea.created_at).toLocaleDateString("pt-BR")}</time>
          <span className="col-span-2 min-w-0 md:col-span-1"><span className="block truncate text-sm font-medium">{idea.title}</span><span className="block truncate text-xs font-normal text-muted-foreground">{wishlistSummary(idea.description)}</span></span>
          <span className="text-xs font-normal text-muted-foreground">{status(idea.status)}</span><span className="flex justify-end">{questionForMe ? <MessageCircleQuestion className="size-5 text-destructive" aria-label="Pergunta aguardando sua resposta" /> : waiting ? <MessageCircleMore className="size-5 text-muted-foreground" aria-label="Aguardando resposta" /> : null}</span>
        </Button>;
      })}</div>
      {!shown.length && <p className="py-10 text-center text-sm text-muted-foreground">{search || filters.active ? "Nenhum desejo nesta seleção." : "Nenhum desejo registrado."}</p>}
    </section>
    {selected && <WishlistIdeaDialog key={selected} idea={selectedIdea} messages={data.messages} steps={data.steps} users={data.users} userId={userId} isAdmin={data.isAdmin} onClose={() => setSelected(null)} />}
  </main>;
}