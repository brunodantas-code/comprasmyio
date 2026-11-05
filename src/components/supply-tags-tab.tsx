import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Search } from "lucide-react";
import { normalizeSearch } from "@/lib/supply-tags";

export type SupplyTag = { id: string; name: string; description: string | null; active: boolean; created_by: string | null; created_at: string };

export function useSupplyTags() {
  return useQuery({
    queryKey: ["supply_tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("supply_tags").select("id,name,description,active,created_by,created_at").order("name");
      if (error) throw error;
      return data as SupplyTag[];
    },
  });
}

export function useCanManageSupplyTags(userId?: string) {
  return useQuery({
    queryKey: ["can_manage_supply_tags", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("can_manage_supply_tags", { _user_id: userId! });
      if (error) throw error;
      return Boolean(data);
    },
  });
}

const duplicate = (e: { code?: string; message: string }) => (e.code === "23505" ? "Esta etiqueta já está cadastrada" : e.message);

export function SupplyTagsTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: tags, isLoading } = useSupplyTags();
  const { data: canManage } = useCanManageSupplyTags(userId);
  const [search, setSearch] = useState("");
  const { data: creators } = useQuery({
    queryKey: ["supply_tags_creators", (tags ?? []).map((t) => t.created_by).join()],
    enabled: !!tags?.length,
    queryFn: async () => {
      const ids = [...new Set((tags ?? []).map((t) => t.created_by).filter(Boolean))] as string[];
      const { data } = await supabase.from("profiles").select("id,full_name").in("id", ids);
      return new Map((data ?? []).map((p) => [p.id, p.full_name as string]));
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["supply_tags"] });

  const save = useMutation({
    mutationFn: async (v: { id?: string; name: string; description: string | null; active?: boolean }) => {
      const { error } = v.id
        ? await supabase.from("supply_tags").update({ name: v.name, description: v.description, active: v.active }).eq("id", v.id)
        : await supabase.from("supply_tags").insert({ name: v.name, description: v.description, created_by: userId });
      if (error) throw new Error(duplicate(error));
    },
    onSuccess: () => { toast.success("Etiqueta salva"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (tag: SupplyTag) => {
      const { count } = await supabase.from("purchase_orders").select("id", { count: "exact", head: true }).eq("tag_id", tag.id);
      if (count) {
        const { error } = await supabase.from("supply_tags").update({ active: false }).eq("id", tag.id);
        if (error) throw error;
        return "Etiqueta usada em solicitações: foi inativada e preservada no histórico";
      }
      const { error } = await supabase.from("supply_tags").delete().eq("id", tag.id);
      if (error) throw error;
      return "Etiqueta excluída";
    },
    onSuccess: (msg) => { toast.success(msg); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = normalizeSearch(search);
    return (tags ?? []).filter((t) => !q || normalizeSearch(`${t.name} ${t.description ?? ""}`).includes(q));
  }, [tags, search]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>Etiquetas</CardTitle>
        {canManage && <TagDialog onSave={(v) => save.mutate(v)} />}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Identificam projetos internos (feiras, novas tecnologias etc.) para consolidar seu custo total. {canManage ? "" : "Somente Admin, Financeiro e Compras criam ou alteram etiquetas."}</p>
        <div className="relative max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar etiqueta" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : !filtered.length ? <p className="text-sm text-muted-foreground">Nenhuma etiqueta.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Descrição</TableHead><TableHead>Situação</TableHead><TableHead>Criada por</TableHead><TableHead>Data</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="max-w-[240px] whitespace-pre-wrap break-words text-sm text-muted-foreground">{t.description || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.active ? "Ativa" : "Inativa"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{(t.created_by && creators?.get(t.created_by)) || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(t.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="space-x-1 whitespace-nowrap text-right">
                    {canManage && <>
                      <TagDialog tag={t} onSave={(v) => save.mutate({ ...v, id: t.id })} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="compactIcon" variant="ghost" title="Excluir" aria-label="Excluir"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Excluir etiqueta?</AlertDialogTitle><AlertDialogDescription>Se “{t.name}” já estiver em solicitações, ela será inativada para preservar o histórico.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(t)}>Excluir</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function TagDialog({ tag, onSave }: { tag?: SupplyTag; onSave: (v: { name: string; description: string | null; active?: boolean }) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {tag ? <Button size="compactIcon" variant="ghost" title="Editar" aria-label="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
          : <Button size="compactIcon" variant="action" title="Nova etiqueta" aria-label="Nova etiqueta"><Plus className="h-3.5 w-3.5" /></Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{tag ? "Editar etiqueta" : "Nova etiqueta"}</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const name = String(fd.get("name") || "").trim();
          if (name.length < 2) return toast.error("Nome muito curto");
          onSave({ name, description: String(fd.get("description") || "").trim() || null, active: tag ? fd.get("active") === "on" : undefined });
          setOpen(false);
        }}>
          <div className="space-y-2"><Label>Nome</Label><Input name="name" defaultValue={tag?.name ?? ""} placeholder="Ex.: Feira Expo 2026" required /></div>
          <div className="space-y-2"><Label>Descrição</Label><Input name="description" defaultValue={tag?.description ?? ""} /></div>
          {tag && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={tag.active} /> Ativa</label>}
          <DialogFooter><Button type="submit" variant="action">Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
