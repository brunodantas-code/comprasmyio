import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type ClientCategory = { id: string; name: string; position: number; active: boolean };

export function useClientCategories(activeOnly = false) {
  return useQuery({
    queryKey: ["client-categories", activeOnly],
    queryFn: async () => {
      let query = supabase.from("client_categories").select("id,name,position,active").order("position").order("name");
      if (activeOnly) query = query.eq("active", true);
      const { data, error } = await query;
      if (error) throw error;
      return data as ClientCategory[];
    },
  });
}

export function ClientCategoriesTab() {
  const qc = useQueryClient();
  const { data: categories, isLoading } = useClientCategories();
  const [expanded, setExpanded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["client-categories"] });
  const duplicate = (name: string, id?: string) => categories?.some((item) => item.id !== id && item.name.trim().toLocaleLowerCase("pt-BR") === name.trim().toLocaleLowerCase("pt-BR"));
  const create = useMutation({ mutationFn: async ({ name, position }: { name: string; position: number }) => { if (duplicate(name)) throw new Error("Esta categoria já está cadastrada"); const { error } = await supabase.from("client_categories").insert({ name: name.trim(), position }); if (error?.code === "23505") throw new Error("Esta categoria já está cadastrada"); if (error) throw error; }, onSuccess: () => { toast.success("Categoria criada"); setCreateOpen(false); invalidate(); }, onError: (error: Error) => toast.error(error.message) });
  const update = useMutation({ mutationFn: async ({ id, name, position }: { id: string; name: string; position: number }) => { if (duplicate(name, id)) throw new Error("Esta categoria já está cadastrada"); const { error } = await supabase.from("client_categories").update({ name: name.trim(), position }).eq("id", id); if (error) throw error; }, onSuccess: () => { toast.success("Categoria atualizada"); invalidate(); }, onError: (error: Error) => toast.error(error.message) });
  const toggle = useMutation({ mutationFn: async ({ id, active }: { id: string; active: boolean }) => { const { error } = await supabase.from("client_categories").update({ active }).eq("id", id); if (error) throw error; }, onSuccess: invalidate, onError: (error: Error) => toast.error(error.message) });
  const remove = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from("client_categories").delete().eq("id", id); if (error?.code === "23503") throw new Error("Esta categoria está vinculada e não pode ser excluída."); if (error) throw error; }, onSuccess: () => { toast.success("Categoria excluída"); invalidate(); }, onError: (error: Error) => toast.error(error.message) });

  return <Collapsible open={expanded} onOpenChange={setExpanded} asChild><Card>
    <CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle>Categorias de Clientes</CardTitle>{expanded && <CardDescription>As categorias ativas ficam disponíveis no cadastro de clientes e unidades.</CardDescription>}</div><div className="flex items-center gap-1"><CollapsibleContent><CategoryDialog title="Nova categoria de cliente" defaultPosition={Math.max(0, ...(categories ?? []).map((item) => item.position)) + 1} saving={create.isPending} onSave={(name, position) => create.mutateAsync({ name, position })} trigger={<Button size="compactIcon" aria-label="Criar categoria" title="Criar categoria"><Plus /></Button>} open={createOpen} onOpenChange={setCreateOpen} /></CollapsibleContent><CollapsibleTrigger asChild><Button size="compactIcon" variant="ghost" aria-label={expanded ? "Recolher Categorias de Clientes" : "Expandir Categorias de Clientes"}>{expanded ? <Minus /> : <Plus />}</Button></CollapsibleTrigger></div></CardHeader>
    <CollapsibleContent asChild><CardContent>{isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Ordem</TableHead><TableHead>Ativa</TableHead><TableHead /></TableRow></TableHeader><TableBody>{(categories ?? []).map((category) => <TableRow key={category.id}><TableCell className="font-medium">{category.name}</TableCell><TableCell>{category.position}</TableCell><TableCell><Switch checked={category.active} onCheckedChange={(active) => toggle.mutate({ id: category.id, active })} /></TableCell><TableCell className="text-right"><div className="flex items-center justify-end gap-1"><CategoryDialog title="Editar categoria" defaultName={category.name} defaultPosition={category.position} saving={update.isPending} onSave={(name, position) => update.mutateAsync({ id: category.id, name, position })} trigger={<Button size="compactIcon" variant="ghost" aria-label={`Editar ${category.name}`}><Pencil /></Button>} /><ConfirmDeleteButton title={`Excluir ${category.name}?`} description="A exclusão será permitida somente quando não houver vínculos." pending={remove.isPending} onConfirm={() => remove.mutate(category.id)} ariaLabel={`Excluir ${category.name}`} /></div></TableCell></TableRow>)}</TableBody></Table>}</CardContent></CollapsibleContent>
  </Card></Collapsible>;
}

function CategoryDialog({ title, defaultName = "", defaultPosition, saving, onSave, trigger, open: controlledOpen, onOpenChange }: { title: string; defaultName?: string; defaultPosition: number; saving: boolean; onSave: (name: string, position: number) => Promise<unknown>; trigger: ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false); const [name, setName] = useState(defaultName); const [position, setPosition] = useState(String(defaultPosition)); const open = controlledOpen ?? internalOpen; const setOpen = onOpenChange ?? setInternalOpen;
  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) { setName(defaultName); setPosition(String(defaultPosition)); } }}><DialogTrigger asChild>{trigger}</DialogTrigger><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Defina o nome e a ordem de exibição.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); const order = Number(position); if (name.trim().length < 2) return toast.error("Informe um nome válido"); if (!Number.isInteger(order) || order < 0) return toast.error("Informe uma ordem válida"); try { await onSave(name.trim(), order); setOpen(false); } catch { /* A alteração exibe a mensagem. */ } }}><div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(event) => setName(event.target.value)} required /></div><div className="space-y-2"><Label>Ordem</Label><Input type="number" min={0} value={position} onChange={(event) => setPosition(event.target.value)} required /></div><DialogFooter><Button type="submit" disabled={saving}>Salvar</Button></DialogFooter></form></DialogContent></Dialog>;
}