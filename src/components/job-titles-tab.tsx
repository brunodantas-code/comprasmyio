import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

export type JobTitle = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};

export function useJobTitles() {
  return useQuery({
    queryKey: ["job_titles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_titles")
        .select("id,name,description,active")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as JobTitle[];
    },
  });
}

type FormValues = { name: string; description: string | null };

export function JobTitlesTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: titles, isLoading } = useJobTitles();

  const create = useMutation({
    mutationFn: async (v: FormValues) => {
      const { error } = await supabase.from("job_titles").insert({ ...v, created_by: userId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cargo criado"); qc.invalidateQueries({ queryKey: ["job_titles"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (v: FormValues & { id: string }) => {
      const { error } = await supabase.from("job_titles").update({ name: v.name, description: v.description }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cargo atualizado"); qc.invalidateQueries({ queryKey: ["job_titles"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_titles").update({ active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cargo desativado"); qc.invalidateQueries({ queryKey: ["job_titles"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") || "").trim();
    const description = String(fd.get("description") || "").trim();
    if (name.length < 2) return toast.error("Nome muito curto");
    create.mutate({ name, description: description || null }, { onSuccess: () => form.reset() });
  }

  return (
    <div className="grid gap-6 [&>*]:min-w-0 lg:grid-cols-[1fr_1.5fr]">
      <Card>
        <CardHeader><CardTitle>Novo cargo</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="jt-name">Nome</Label><Input id="jt-name" name="name" required /></div>
            <div className="space-y-2"><Label htmlFor="jt-desc">Descrição</Label><Textarea id="jt-desc" name="description" rows={3} /></div>
            <Button type="submit" disabled={create.isPending}>Criar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Cargos</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
            !titles?.length ? <p className="text-sm text-muted-foreground">Sem cargos cadastrados.</p> :
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Descrição</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {titles.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="max-w-[260px] whitespace-pre-wrap break-words text-sm text-muted-foreground">{t.description || "—"}</TableCell>
                    <TableCell className="space-x-1 text-right">
                      <EditJobTitleDialog title={t} onSave={(v) => update.mutate({ id: t.id, ...v })} />
                      <DeleteJobTitleDialog name={t.name} onConfirm={() => remove.mutate(t.id)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
        </CardContent>
      </Card>
    </div>
  );
}

function EditJobTitleDialog({ title, onSave }: { title: JobTitle; onSave: (v: FormValues) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" title="Editar" aria-label="Editar">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar cargo</DialogTitle></DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const name = String(fd.get("name") || "").trim();
            const description = String(fd.get("description") || "").trim();
            if (name.length < 2) return toast.error("Nome muito curto");
            onSave({ name, description: description || null });
            setOpen(false);
          }}
        >
          <div className="space-y-2"><Label>Nome</Label><Input name="name" defaultValue={title.name} required /></div>
          <div className="space-y-2"><Label>Descrição</Label><Textarea name="description" rows={3} defaultValue={title.description ?? ""} /></div>
          <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteJobTitleDialog({ name, onConfirm }: { name: string; onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" title="Excluir" aria-label="Excluir" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir cargo</DialogTitle>
          <DialogDescription>Confirma a exclusão de {name}?</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="destructive" onClick={() => { onConfirm(); setOpen(false); }}>Excluir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
