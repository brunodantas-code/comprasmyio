import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export type OperationalFunction = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
};

export function useOperationalFunctions(includeInactive = false) {
  return useQuery({
    queryKey: ["operational-functions", includeInactive],
    queryFn: async () => {
      let query = supabase.from("operational_functions").select("id,code,name,description,active").order("name");
      if (!includeInactive) query = query.eq("active", true);
      const { data, error } = await query;
      if (error) throw error;
      return data as OperationalFunction[];
    },
  });
}

const makeCode = (name: string) => name
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "_")
  .replace(/^_+|_+$/g, "")
  .slice(0, 60);

type Values = { name: string; description: string | null };

export function OperationalFunctionsTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: functions, isLoading } = useOperationalFunctions(true);

  const create = useMutation({
    mutationFn: async (values: Values) => {
      const code = makeCode(values.name);
      if (!code) throw new Error("Informe um nome válido.");
      const { error } = await supabase.from("operational_functions").insert({ ...values, code, created_by: userId });
      if (error?.code === "23505") throw new Error("Esta função operacional já está cadastrada.");
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Função operacional criada"); qc.invalidateQueries({ queryKey: ["operational-functions"] }); },
    onError: (error: Error) => toast.error(error.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...values }: Values & { id: string }) => {
      const { error } = await supabase.from("operational_functions").update(values).eq("id", id);
      if (error?.code === "23505") throw new Error("Esta função operacional já está cadastrada.");
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Função operacional atualizada"); qc.invalidateQueries({ queryKey: ["operational-functions"] }); },
    onError: (error: Error) => toast.error(error.message),
  });

  const deactivate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("operational_functions").update({ active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Função operacional desativada"); qc.invalidateQueries({ queryKey: ["operational-functions"] }); },
    onError: (error: Error) => toast.error(error.message),
  });

  const activate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("operational_functions").update({ active: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Função operacional ativada"); qc.invalidateQueries({ queryKey: ["operational-functions"] }); },
    onError: (error: Error) => toast.error(error.message),
  });

  const onCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    if (name.length < 2) return toast.error("Nome muito curto");
    create.mutate({ name, description: description || null }, { onSuccess: () => form.reset() });
  };

  return (
    <div className="grid gap-6 [&>*]:min-w-0 lg:grid-cols-[1fr_1.5fr]">
      <Card>
        <CardHeader><CardTitle>Nova função operacional</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="operational-name">Nome</Label><Input id="operational-name" name="name" required /></div>
            <div className="space-y-2"><Label htmlFor="operational-description">Descrição</Label><Textarea id="operational-description" name="description" rows={3} /></div>
            <Button type="submit" disabled={create.isPending}>Criar</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Funções operacionais</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : !functions?.length ? <p className="text-sm text-muted-foreground">Nenhuma função cadastrada.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Descrição</TableHead><TableHead>Situação</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>{functions.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="max-w-[300px] whitespace-pre-wrap break-words text-sm text-muted-foreground">{item.description || "—"}</TableCell>
                  <TableCell>{item.active ? "Ativa" : "Inativa"}</TableCell>
                  <TableCell><div className="flex justify-end gap-1">
                    <EditOperationalFunctionDialog item={item} onSave={(values) => update.mutate({ id: item.id, ...values })} />
                    {item.active ? (
                      <DeactivateOperationalFunctionDialog name={item.name} onConfirm={() => deactivate.mutate(item.id)} />
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => activate.mutate(item.id)}>Ativar</Button>
                    )}
                  </div></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EditOperationalFunctionDialog({ item, onSave }: { item: OperationalFunction; onSave: (values: Values) => void }) {
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button size="compactIcon" variant="ghost" title="Editar" aria-label={`Editar ${item.name}`}><Pencil className="h-3.5 w-3.5" /></Button></DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>Editar função operacional</DialogTitle></DialogHeader>
      <form className="space-y-4" onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const name = String(formData.get("name") ?? "").trim();
        const description = String(formData.get("description") ?? "").trim();
        if (name.length < 2) return toast.error("Nome muito curto");
        onSave({ name, description: description || null });
        setOpen(false);
      }}>
        <div className="space-y-2"><Label>Nome</Label><Input name="name" defaultValue={item.name} required /></div>
        <div className="space-y-2"><Label>Descrição</Label><Textarea name="description" rows={3} defaultValue={item.description ?? ""} /></div>
        <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

function DeactivateOperationalFunctionDialog({ name, onConfirm }: { name: string; onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button size="compactIcon" variant="ghost" className="text-destructive hover:text-destructive" title="Desativar" aria-label={`Desativar ${name}`}><Trash2 className="h-3.5 w-3.5" /></Button></DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>Desativar função operacional?</DialogTitle><DialogDescription>Ela deixará de aparecer para novas atribuições. Os usuários já vinculados serão preservados.</DialogDescription></DialogHeader>
      <DialogFooter><Button variant="destructive" onClick={() => { onConfirm(); setOpen(false); }}>Desativar</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}