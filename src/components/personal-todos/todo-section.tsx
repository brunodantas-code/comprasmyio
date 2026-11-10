import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, ListTodo, MessageCircleQuestion, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { CdeSortableList } from "@/components/cde/cde-order";
import { sortTodos, mergeVisibleTodoOrder, TODO_SORT_MODES, isTodoSortMode, type TodoSortMode } from "@/lib/todo-order";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { CdeButton } from "@/components/cde/cde-button";
import { useTableFilters } from "@/components/use-table-filters";
import { personalTodosOptions, todoPreferencesOptions } from "./data";
import { TodoDialog } from "./todo-dialog";
import { todoPendingItems, TODO_STATUSES } from "@/lib/personal-todos";
import { todoLabelsOptions, TodoLabelsManager, TodoLabelMark } from "./labels";

export function TodoSection() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const preferences = useQuery({ ...todoPreferencesOptions(me?.id ?? ""), enabled: Boolean(me) });
  const mode = preferences.data?.sort_mode ?? "manual";
  const sortMode = isTodoSortMode(mode) ? mode : "manual";
  const [ordering, setOrdering] = useState(false);
  async function saveOrder(sort_mode: TodoSortMode, ordered_ids = preferences.data?.ordered_ids ?? []) {
    if (!me || ordering) return;
    setOrdering(true);
    try {
      const result = await supabase.from("personal_todo_preferences").upsert({ user_id: me.id, sort_mode, ordered_ids }).select("*").single();
      if (result.error) throw result.error;
      qc.setQueryData(["todo-preferences", me.id], result.data);
    } catch { toast.error("Não foi possível salvar a ordenação."); } finally { setOrdering(false); }
  }
  const { data, isLoading, error } = useQuery({ ...personalTodosOptions(me?.id ?? ""), enabled: Boolean(me) });
  const { data: labelData } = useQuery({ ...todoLabelsOptions(me?.id ?? ""), enabled: Boolean(me) });
  const labelsFor = (id: string) => labelData?.labels.filter(l => labelData.links.some(link => link.todo_id === id && link.label_id === l.id)) ?? [];
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const pending = todoPendingItems(data?.tasks ?? [], data?.messages ?? [], me?.id ?? "");
  const filters = useTableFilters(data?.tasks ?? [], [
    { key: "title", label: "Título", value: t => t.title },
    { key: "status", label: "Situação", value: t => TODO_STATUSES[t.status] },
    { key: "due", label: "Conclusão prevista", value: t => t.due_date ?? "" },
    { key: "labels", label: "Etiquetas", value: t => labelsFor(t.id).map(l => l.name).join(", ") || "Sem etiqueta" },
  ]);
  const shown = sortTodos(filters.filtered.filter(t => filters.filters.status ? true : !["concluido", "excluido"].includes(t.status)), sortMode, preferences.data?.ordered_ids);
  const task = data?.tasks.find(t => t.id === selected) ?? null;
  return <section className="overflow-hidden rounded-md border border-border bg-card">
    <div className="flex items-center gap-2 pr-3 transition-colors hover:bg-primary/10">
      <Button variant="ghost" aria-expanded={open} onClick={() => setOpen(!open)} className="!h-auto !max-w-none min-w-0 flex-1 !justify-start gap-3 !bg-transparent px-4 py-3"><span className="text-primary">{open ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}</span><ListTodo className="size-5" /><span className="min-w-0 flex-1 text-left">Meus To Do's</span><span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-destructive px-2 text-xs font-bold text-destructive-foreground">{pending.length}</span></Button>
      {filters.menu}<DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="compactIcon" className="!text-foreground !bg-transparent !border-0" aria-label="Ordenar tarefas" title="Ordenar tarefas" disabled={ordering}><ArrowUpDown /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuRadioGroup value={sortMode} onValueChange={value => { if (isTodoSortMode(value)) void saveOrder(value); }}>{Object.entries(TODO_SORT_MODES).map(([value, label]) => <DropdownMenuRadioItem key={value} value={value}>{label}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>{me && <TodoLabelsManager userId={me.id} />}<CdeButton group="plus" screen="components/personal-todos/todo-section.tsx" aria-label="Novo To Do" title="Novo To Do" onClick={() => setSelected("new")} />
    </div>
    {open && <div className="border-t border-border">{isLoading ? <p className="p-4 text-sm text-muted-foreground">Carregando tarefas...</p> : error ? <p className="p-4 text-sm text-destructive">Não foi possível carregar as tarefas.</p> : shown.length ? <CdeSortableList ids={shown.map(t=>t.id)} labelOf={id=>shown.find(t=>t.id===id)?.title ?? "tarefa"} onMove={ids => { const all = sortTodos(data?.tasks ?? [], sortMode, preferences.data?.ordered_ids).map(t=>t.id); void saveOrder("manual", mergeVisibleTodoOrder(all, ids)); }} className="divide-y divide-border">{(id, _index, handle) => { const t = shown.find(t=>t.id===id); if (!t) return null; return <div className="flex items-center pl-4 transition-colors hover:bg-primary/10 [&_button]:hover:!bg-transparent"><span className="shrink-0 [&_button]:!text-foreground">{handle}</span><Button variant="ghost" onClick={() => setSelected(t.id)} className="!h-auto !max-w-none !w-full !min-w-0 !justify-start !bg-transparent hover:!bg-transparent px-3 py-3 text-left"><span className="min-w-0 flex-1 text-left"><span className="block whitespace-normal break-words text-sm">{t.title}</span><span className="block text-left text-xs text-muted-foreground">{TODO_STATUSES[t.status]} · {t.due_date ? t.due_date.split("-").reverse().join("/") : "Sem conclusão prevista"}</span><span className="flex flex-wrap justify-start gap-2">{labelsFor(t.id).map(l => <TodoLabelMark key={l.id} label={l} />)}</span></span>{pending.find(p => p.task.id === t.id)?.questions ? <MessageCircleQuestion className="size-5 text-destructive" /> : null}</Button></div>; }}</CdeSortableList> : <p className="p-4 text-sm text-muted-foreground">Nenhuma tarefa nesta seleção.</p>}</div>}
    {selected && me && <TodoDialog key={selected} task={task} userId={me.id} users={data?.users ?? []} messages={data?.messages ?? []} onClose={() => setSelected(null)} />}
  </section>;
}