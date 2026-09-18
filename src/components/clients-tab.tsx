import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { LinkedRecordDeletionDialog } from "@/components/linked-record-deletion-dialog";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";

export type Client = { id: string; name: string; cnpj: string | null };
export type ClientUnit = { id: string; client_id: string; name: string; cnpj: string | null; active: boolean };

const DUPLICATE_CLIENT_MESSAGE = "Este cliente já está cadastrado";

function isDuplicateNameError(error: { code?: string }) {
  return error.code === "23505";
}

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

export function useClientUnits(clientId?: string) {
  return useQuery({
    queryKey: ["client-units", clientId ?? "all"],
    queryFn: async () => {
      let query = supabase.from("client_units").select("id,client_id,name,cnpj,active").order("name");
      if (clientId) query = query.eq("client_id", clientId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ClientUnit[];
    },
  });
}

export function ClientsTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: clients, isLoading } = useClients();
  const [newUnits, setNewUnits] = useState<string[]>([]);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  const create = useMutation({
    mutationFn: async (v: { name: string; cnpj: string | null; units: string[] }) => {
      const { data: existing, error: lookupError } = await supabase.from("clients").select("id,name");
      if (lookupError) throw lookupError;
      const normalizedName = v.name.trim().toLocaleLowerCase("pt-BR");
      if (existing?.some((item) => item.name.trim().toLocaleLowerCase("pt-BR") === normalizedName)) {
        throw new Error(DUPLICATE_CLIENT_MESSAGE);
      }
      const { data: client, error } = await supabase
        .from("clients")
        .insert({ name: v.name, cnpj: v.cnpj, created_by: userId })
        .select("id")
        .single();
      if (error) throw new Error(isDuplicateNameError(error) ? DUPLICATE_CLIENT_MESSAGE : error.message);
      if (v.units.length) {
        const { error: unitsError } = await supabase.from("client_units").insert(
          v.units.map((name) => ({ client_id: client.id, name, created_by: userId })),
        );
        if (unitsError) throw unitsError;
      }
    },
    onSuccess: () => {
      toast.success("Cliente criado");
      setNewUnits([]);
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client-units"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (v: { id: string; name: string; cnpj: string | null }) => {
      const { data: existing, error: lookupError } = await supabase.from("clients").select("id,name");
      if (lookupError) throw lookupError;
      const normalizedName = v.name.trim().toLocaleLowerCase("pt-BR");
      if (existing?.some((item) => item.id !== v.id && item.name.trim().toLocaleLowerCase("pt-BR") === normalizedName)) {
        throw new Error(DUPLICATE_CLIENT_MESSAGE);
      }
      const { error } = await supabase.from("clients").update({ name: v.name, cnpj: v.cnpj }).eq("id", v.id);
      if (error) throw new Error(isDuplicateNameError(error) ? DUPLICATE_CLIENT_MESSAGE : error.message);
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
    const normalizedUnits = newUnits.map((unit) => unit.trim()).filter((unit, index, list) => unit.length >= 2 && list.indexOf(unit) === index);
    create.mutate({ name, cnpj: cnpj || null, units: normalizedUnits }, { onSuccess: () => form.reset() });
  }

  return (
    <div className="grid gap-6 [&>*]:min-w-0 lg:grid-cols-[1fr_1.5fr]">
      <Card>
        <CardHeader><CardTitle>Novo cliente</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="c-name">Nome do cliente</Label><Input id="c-name" name="name" required /></div>
            <div className="space-y-2"><Label htmlFor="c-cnpj">CNPJ</Label><Input id="c-cnpj" name="cnpj" placeholder="00.000.000/0000-00" /></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Filiais ou unidades</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => setNewUnits((current) => [...current, ""])}>
                  <Plus className="mr-1 h-4 w-4" />Adicionar
                </Button>
              </div>
              {!newUnits.length && <p className="text-xs text-muted-foreground">Você poderá cadastrar unidades agora ou depois.</p>}
              {newUnits.map((unit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={unit}
                    onChange={(event) => setNewUnits((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                    placeholder="Nome da filial ou unidade"
                    aria-label={`Filial ou unidade ${index + 1}`}
                  />
                  <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setNewUnits((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remover unidade" title="Remover unidade">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
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
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>CNPJ</TableHead><TableHead className="w-20" /></TableRow></TableHeader>
              <TableBody>
                {clients.map((c) => {
                  const expanded = expandedClients.has(c.id);
                  return (
                  <>
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6! w-6! shrink-0"
                            onClick={() => setExpandedClients((current) => {
                              const next = new Set(current);
                              if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
                              return next;
                            })}
                            title={expanded ? `Recolher unidades de ${c.name}` : `Exibir unidades de ${c.name}`}
                            aria-label={expanded ? `Recolher unidades de ${c.name}` : `Exibir unidades de ${c.name}`}
                          >
                            {expanded ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                          </Button>
                          <span>{c.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.cnpj || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                          <EditClientDialog client={c} onSave={(v) => update.mutate({ id: c.id, ...v })} />
                       <LinkedRecordDeletionDialog
                         entityId={c.id}
                         entityName={c.name}
                         entityLabel="cliente"
                         linkField="client_id"
                         destinations={(clients ?? []).map((client) => ({ id: client.id, name: client.name }))}
                         onDelete={() => remove.mutate(c.id)}
                         deleting={remove.isPending}
                          trigger={<Button type="button" size="icon" variant="ghost" className="h-6! w-6! shrink-0 text-destructive hover:text-destructive" title={`Excluir ${c.name}`} aria-label={`Excluir ${c.name}`}><Trash2 className="h-3.5 w-3.5" /></Button>}
                       />
                        </div>
                      </TableCell>
                    </TableRow>
                    {expanded && <TableRow key={`${c.id}-units`} className="hover:bg-transparent"><TableCell colSpan={3} className="px-3 py-4 sm:px-6"><ClientUnitsList client={c} userId={userId} /></TableCell></TableRow>}
                  </>
                );})}
              </TableBody>
            </Table>
          }
        </CardContent>
      </Card>
    </div>
  );
}

function ClientUnitsList({ client, userId }: { client: Client; userId: string }) {
  const qc = useQueryClient();
  const { data: units } = useClientUnits(client.id);
  const create = useMutation({
    mutationFn: async (values: { name: string; cnpj: string | null }) => {
      const { error } = await supabase.from("client_units").insert({ client_id: client.id, name: values.name, cnpj: values.cnpj, created_by: userId });
      if (error) throw new Error(error.code === "23505" ? "Esta unidade já está cadastrada para o cliente" : error.message);
    },
    onSuccess: () => {
      toast.success("Unidade cadastrada");
      qc.invalidateQueries({ queryKey: ["client-units"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const toggle = useMutation({
    mutationFn: async (unit: ClientUnit) => {
      const { error } = await supabase.from("client_units").update({ active: !unit.active }).eq("id", unit.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-units"] }),
    onError: (error: Error) => toast.error(error.message),
  });
  const update = useMutation({
    mutationFn: async ({ id, name, cnpj }: { id: string; name: string; cnpj: string | null }) => {
      const { error } = await supabase.from("client_units").update({ name, cnpj }).eq("id", id);
      if (error) throw new Error(error.code === "23505" ? "Esta unidade já está cadastrada para o cliente" : error.message);
    },
    onSuccess: () => { toast.success("Unidade atualizada"); qc.invalidateQueries({ queryKey: ["client-units"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_units").delete().eq("id", id);
      if (error?.code === "23503") throw new Error("Esta unidade possui solicitações vinculadas e não pode ser excluída.");
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Unidade excluída"); qc.invalidateQueries({ queryKey: ["client-units"] }); },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Filiais ou unidades</p>
        <UnitDialog
          title={`Nova unidade de ${client.name}`}
          saving={create.isPending}
          onSave={(values) => create.mutateAsync(values)}
          trigger={<Button type="button" size="sm"><Plus className="mr-1 h-4 w-4" />Adicionar unidade</Button>}
        />
      </div>
      {!units?.length ? <p className="text-sm text-muted-foreground">Nenhuma unidade cadastrada.</p> : (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>CNPJ</TableHead><TableHead>Status</TableHead><TableHead className="w-20" /></TableRow></TableHeader>
            <TableBody>
              {(units ?? []).map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell className="font-medium">{unit.name}</TableCell>
                  <TableCell className="text-muted-foreground">{unit.cnpj || "—"}</TableCell>
                  <TableCell><Button type="button" variant="outline" size="sm" disabled={toggle.isPending} onClick={() => toggle.mutate(unit)}>{unit.active ? "Ativa" : "Inativa"}</Button></TableCell>
                  <TableCell className="text-right"><div className="flex items-center justify-end gap-1 whitespace-nowrap">
                    <UnitDialog
                      title={`Editar ${unit.name}`}
                      unit={unit}
                      saving={update.isPending}
                      onSave={(values) => update.mutateAsync({ id: unit.id, ...values })}
                      trigger={<Button type="button" size="icon" variant="ghost" className="h-6! w-6! shrink-0" title={`Editar ${unit.name}`} aria-label={`Editar ${unit.name}`}><Pencil className="h-3.5 w-3.5" /></Button>}
                    />
                    <ConfirmDeleteButton
                      title="Excluir unidade"
                      description={`Confirma a exclusão de “${unit.name}”?`}
                      pending={remove.isPending}
                      onConfirm={() => remove.mutate(unit.id)}
                      ariaLabel={`Excluir ${unit.name}`}
                      trigger={<Button type="button" size="icon" variant="ghost" className="h-6! w-6! shrink-0 text-destructive hover:text-destructive" title={`Excluir ${unit.name}`} aria-label={`Excluir ${unit.name}`}><Trash2 className="h-3.5 w-3.5" /></Button>}
                    />
                  </div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function UnitDialog({ title, unit, saving, onSave, trigger }: { title: string; unit?: ClientUnit; saving: boolean; onSave: (values: { name: string; cnpj: string | null }) => Promise<unknown>; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={async (event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const name = String(formData.get("name") || "").trim();
          const cnpj = String(formData.get("cnpj") || "").trim();
          if (name.length < 2) return toast.error("Informe o nome da unidade");
          try { await onSave({ name, cnpj: cnpj || null }); setOpen(false); } catch { /* A alteração exibe a mensagem. */ }
        }}>
          <div className="space-y-2"><Label>Nome da unidade</Label><Input name="name" defaultValue={unit?.name ?? ""} required /></div>
          <div className="space-y-2"><Label>CNPJ</Label><Input name="cnpj" defaultValue={unit?.cnpj ?? ""} placeholder="00.000.000/0000-00" /></div>
          <DialogFooter><Button type="submit" disabled={saving}>Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditClientDialog({ client, onSave }: { client: Client; onSave: (v: { name: string; cnpj: string | null }) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-6! w-6! shrink-0" title="Editar" aria-label="Editar">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
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
