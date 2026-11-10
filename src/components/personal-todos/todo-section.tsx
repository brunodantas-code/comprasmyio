import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, ListTodo, MessageCircleQuestion } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { CdeButton } from "@/components/cde/cde-button";
import { useTableFilters } from "@/components/use-table-filters";
import { personalTodosOptions } from "./data";
import { TodoDialog } from "./todo-dialog";
import { todoPendingItems, TODO_STATUSES } from "@/lib/personal-todos";

export function TodoSection() {
  const { data: me } = useCurrentUser();
  const { data, isLoading, error } = useQuery({ ...personalTodosOptions(me?.id ?? ""), enabled: Boolean(me) });
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const pending = todoPendingItems(data?.tasks ?? [], data?.messages ?? [], me?.id ?? "");
  const filters = useTableFilters(data?.tasks ?? [], [
    { key: "title", label: "Título", value: t => t.title },
    { key: "status", label: "Situação", value: t => TODO_STATUSES[t.status] },
    { key: "due", label: "Conclusão prevista", value: t => t.due_date ?? "" },
  ]);
  const shown = filters.filtered.filter(t => filters.filters.status ? true : !["concluido", "excluido"].includes(t.status));
  const task = data?.tasks.find(t => t.id === selected) ?? null;
  return <section className="overflow-hidden rounded-md border border-border bg-card">
    <div className="flex items-center gap-2 pr-3 transition-colors hover:bg-primary/10">
      <Button variant="ghost" aria-expanded={open} onClick={() => setOpen(!open)} className="!h-auto !max-w-none min-w-0 flex-1 !justify-start gap-3 !bg-transparent px-4 py-3"><span className="text-primary">{open ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}</span><ListTodo className="size-5" /><span className="min-w-0 flex-1 text-left">Meus To Do's</span><span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-destructive px-2 text-xs font-bold text-destructive-foreground">{pending.length}</span></Button>
      {filters.menu}<CdeButton group="plus" screen="components/personal-todos/todo-section.tsx" aria-label="Novo To Do" title="Novo To Do" onClick={() => setSelected("new")} />
    </div>
    {open && <div className="divide-y divide-border border-t border-border">{isLoading ? <p className="p-4 text-sm text-muted-foreground">Carregando tarefas...</p> : error ? <p className="p-4 text-sm text-destructive">Não foi possível carregar as tarefas.</p> : shown.length ? shown.map(t => <div key={t.id} className="transition-colors hover:bg-primary/10"><Button variant="ghost" onClick={() => setSelected(t.id)} className="!h-auto !max-w-none !w-full !justify-start !bg-transparent px-4 py-3 text-left"><span className="text-xs text-muted-foreground">{t.todo_number}</span><span className="min-w-0 flex-1"><span className="block break-words text-sm">{t.title}</span><span className="block text-xs text-muted-foreground">{TODO_STATUSES[t.status]} · {t.due_date ? t.due_date.split("-").reverse().join("/") : "Sem conclusão prevista"}</span></span>{pending.find(p => p.task.id === t.id)?.questions ? <MessageCircleQuestion className="size-5 text-destructive" /> : null}</Button></div>) : <p className="p-4 text-sm text-muted-foreground">Nenhuma tarefa nesta seleção.</p>}</div>}
    {selected && me && <TodoDialog key={selected} task={task} userId={me.id} users={data?.users ?? []} messages={data?.messages ?? []} onClose={() => setSelected(null)} />}
  </section>;
}