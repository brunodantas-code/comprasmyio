import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

export type Client = { id: string; name: string; cnpj: string | null };

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id,name,cnpj").order("name");
      if (error) throw error;
      return data as Client[];
    },
  });
}

export function ClientsTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: clients, isLoading } = useClients();

  const create = useMutation({
    mutationFn: async (v: { name: string; cnpj: string | null }) => {
      const { error } = await supabase.from("clients").insert({ ...v, created_by: userId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cliente criado"); qc.invalidateQueries({ queryKey: ["clients"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (v: { id: string; name: string; cnpj: string | null }) => {
      const { error } = await supabase.from("clients").update({ name: v.name, cnpj: v.cnpj }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cliente atualizado"); qc.invalidateQueries({ queryKey: ["clients"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente removido");
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") || "").trim();
    const cnpj = String(fd.get("cnpj") || "").trim();
    if (name.length < 2) return toast.error("Nome muito curto");
    create.mutate({ name, cnpj: cnpj || null }, { onSuccess: () => form.reset() });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
      <Card>
        <CardHeader><CardTitle>Novo cliente</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="c-name">Nome do cliente</Label><Input id="c-name" name="name" required /></div>
            <div className="space-y-2"><Label htmlFor="c-cnpj">CNPJ</Label><Input id="c-cnpj" name="cnpj" placeholder="00.000.000/0000-00" /></div>
            <Button type="submit" disabled={create.isPending}>Criar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Clientes</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
            !clients?.length ? <p className="text-sm text-muted-foreground">Sem clientes.</p> :
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>CNPJ</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.cnpj || "—"}</TableCell>
                    <TableCell className="space-x-1 text-right">
                      <EditClientDialog client={c} onSave={(v) => update.mutate({ id: c.id, ...v })} />
                      <DeleteClientDialog name={c.name} onConfirm={() => remove.mutate(c.id)} />
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

function EditClientDialog({ client, onSave }: { client: Client; onSave: (v: { name: string; cnpj: string | null }) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="ghost">Editar</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar cliente</DialogTitle></DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const name = String(fd.get("name") || "").trim();
            const cnpj = String(fd.get("cnpj") || "").trim();
            if (name.length < 2) return toast.error("Nome muito curto");
            onSave({ name, cnpj: cnpj || null });
            setOpen(false);
          }}
        >
          <div className="space-y-2"><Label>Nome do cliente</Label><Input name="name" defaultValue={client.name} required /></div>
          <div className="space-y-2"><Label>CNPJ</Label><Input name="cnpj" defaultValue={client.cnpj ?? ""} /></div>
          <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteClientDialog({ name, onConfirm }: { name: string; onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); setText(""); }}>
      <DialogTrigger asChild><Button size="sm" variant="ghost">Excluir</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir cliente</DialogTitle>
          <DialogDescription>Digite "excluir" para remover {name}. Projetos vinculados ficarão sem cliente.</DialogDescription>
        </DialogHeader>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="excluir" />
        <DialogFooter>
          <Button variant="destructive" disabled={text.trim().toLowerCase() !== "excluir"} onClick={() => { onConfirm(); setOpen(false); }}>Excluir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
