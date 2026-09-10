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

export type CostCenter = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  active: boolean;
};

export function useCostCenters() {
  return useQuery({
    queryKey: ["cost_centers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_centers")
        .select("id,name,code,description,active")
        .order("name");
      if (error) throw error;
      return data as CostCenter[];
    },
  });
}

type FormValues = { name: string; code: string | null; description: string | null };

export function CostCentersTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: centers, isLoading } = useCostCenters();

  const create = useMutation({
    mutationFn: async (v: FormValues) => {
      const { error } = await supabase.from("cost_centers").insert({ ...v, created_by: userId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Centro de custo criado"); qc.invalidateQueries({ queryKey: ["cost_centers"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (v: FormValues & { id: string }) => {
      const { error } = await supabase.from("cost_centers").update({ name: v.name, code: v.code, description: v.description }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Centro de custo atualizado"); qc.invalidateQueries({ queryKey: ["cost_centers"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cost_centers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Centro de custo removido"); qc.invalidateQueries({ queryKey: ["cost_centers"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") || "").trim();
    const code = String(fd.get("code") || "").trim();
    const description = String(fd.get("description") || "").trim();
    if (name.length < 2) return toast.error("Nome muito curto");
    create.mutate({ name, code: code || null, description: description || null }, { onSuccess: () => form.reset() });
  }

  return (
    <div className="grid gap-6 [&>*]:min-w-0 lg:grid-cols-[1fr_1.5fr]">
      <Card>
        <CardHeader><CardTitle>Novo centro de custo</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="cc-name">Nome</Label><Input id="cc-name" name="name" required /></div>
            <div className="space-y-2"><Label htmlFor="cc-code">Código</Label><Input id="cc-code" name="code" placeholder="Ex.: CC-100" /></div>
            <div className="space-y-2"><Label htmlFor="cc-desc">Descrição</Label><Textarea id="cc-desc" name="description" rows={3} /></div>
            <Button type="submit" disabled={create.isPending}>Criar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Centros de custo</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
            !centers?.length ? <p className="text-sm text-muted-foreground">Sem centros de custo.</p> :
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Código</TableHead><TableHead>Descrição</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {centers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.code || "—"}</TableCell>
                    <TableCell className="max-w-[220px] whitespace-pre-wrap break-words text-sm text-muted-foreground">{c.description || "—"}</TableCell>
                    <TableCell className="space-x-1 text-right">
                      <EditCostCenterDialog center={c} onSave={(v) => update.mutate({ id: c.id, ...v })} />
                      <DeleteCostCenterDialog name={c.name} onConfirm={() => remove.mutate(c.id)} />
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

function EditCostCenterDialog({ center, onSave }: { center: CostCenter; onSave: (v: FormValues) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" title="Editar" aria-label="Editar">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar centro de custo</DialogTitle></DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const name = String(fd.get("name") || "").trim();
            const code = String(fd.get("code") || "").trim();
            const description = String(fd.get("description") || "").trim();
            if (name.length < 2) return toast.error("Nome muito curto");
            onSave({ name, code: code || null, description: description || null });
            setOpen(false);
          }}
        >
          <div className="space-y-2"><Label>Nome</Label><Input name="name" defaultValue={center.name} required /></div>
          <div className="space-y-2"><Label>Código</Label><Input name="code" defaultValue={center.code ?? ""} /></div>
          <div className="space-y-2"><Label>Descrição</Label><Textarea name="description" rows={3} defaultValue={center.description ?? ""} /></div>
          <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCostCenterDialog({ name, onConfirm }: { name: string; onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); setText(""); }}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" title="Excluir" aria-label="Excluir" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir centro de custo</DialogTitle>
          <DialogDescription>Digite "excluir" para remover {name}.</DialogDescription>
        </DialogHeader>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="excluir" />
        <DialogFooter>
          <Button variant="destructive" disabled={text.trim().toLowerCase() !== "excluir"} onClick={() => { onConfirm(); setOpen(false); }}>Excluir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
