import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LinkedRecordDeletionDialog } from "@/components/linked-record-deletion-dialog";

export type AdditionalStepType = {
  code: string;
  name: string;
  active: boolean;
};

const DUPLICATE_MESSAGE = "Este tipo de etapa adicional já está cadastrado";

function makeCode(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function friendlyError(error: { code?: string; message: string }) {
  if (error.code === "23505") return DUPLICATE_MESSAGE;
  if (error.code === "23503") return "Este tipo está sendo usado em Etapas Adicionais. Desative-o ou altere as etapas antes de excluir.";
  return error.message;
}

export function useAdditionalStepTypes() {
  return useQuery({
    queryKey: ["additional-step-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("additional_step_types")
        .select("code,name,active")
        .order("name");
      if (error) throw error;
      return data as AdditionalStepType[];
    },
  });
}

export function AdditionalStepTypesTab() {
  const qc = useQueryClient();
  const { data: types, isLoading } = useAdditionalStepTypes();
  const [name, setName] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["additional-step-types"] });

  const create = useMutation({
    mutationFn: async (typeName: string) => {
      const normalizedName = typeName.trim().toLocaleLowerCase("pt-BR");
      if (types?.some((type) => type.name.trim().toLocaleLowerCase("pt-BR") === normalizedName)) {
        throw new Error(DUPLICATE_MESSAGE);
      }
      const code = makeCode(typeName);
      if (!code) throw new Error("Informe um nome válido");
      const { error } = await supabase.from("additional_step_types").insert({ code, name: typeName.trim() });
      if (error) throw new Error(friendlyError(error));
    },
    onSuccess: () => {
      toast.success("Tipo criado");
      setName("");
      setCreateOpen(false);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const update = useMutation({
    mutationFn: async ({ code, name: nextName }: { code: string; name: string }) => {
      const normalizedName = nextName.trim().toLocaleLowerCase("pt-BR");
      if (types?.some((type) => type.code !== code && type.name.trim().toLocaleLowerCase("pt-BR") === normalizedName)) {
        throw new Error(DUPLICATE_MESSAGE);
      }
      const { error } = await supabase.from("additional_step_types").update({ name: nextName.trim() }).eq("code", code);
      if (error) throw new Error(friendlyError(error));
    },
    onSuccess: () => {
      toast.success("Tipo atualizado");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ code, active }: { code: string; active: boolean }) => {
      const { error } = await supabase.from("additional_step_types").update({ active }).eq("code", code);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase.from("additional_step_types").delete().eq("code", code);
      if (error) throw new Error(friendlyError(error));
    },
    onSuccess: () => {
      toast.success("Tipo excluído");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
      <Collapsible open={expanded} onOpenChange={setExpanded} asChild>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div><CardTitle>Tipos de Etapa Adicional</CardTitle>{expanded && <CardDescription>Os tipos ativos ficam disponíveis nas Etapas Adicionais.</CardDescription>}</div>
          <div className="flex items-center gap-1"><CollapsibleContent><Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setName(""); }}>
            <DialogTrigger asChild><Button size="icon" aria-label="Criar tipo de etapa adicional" title="Criar tipo"><Plus className="h-4 w-4" /></Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo tipo de etapa adicional</DialogTitle><DialogDescription>Cadastre um novo item para esta lista.</DialogDescription></DialogHeader>
              <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); const trimmedName = name.trim(); if (trimmedName.length < 2) return toast.error("Nome muito curto"); create.mutate(trimmedName); }}>
                <div className="space-y-2"><Label htmlFor="additional-step-type-name">Nome</Label><Input id="additional-step-type-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Inserir nome" required /></div>
                <DialogFooter><Button type="submit" disabled={create.isPending}>Criar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog></CollapsibleContent><CollapsibleTrigger asChild><Button size="icon" variant="ghost" aria-label={expanded ? "Recolher Tipos de Etapa Adicional" : "Expandir Tipos de Etapa Adicional"} title={expanded ? "Recolher" : "Expandir"}>{expanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</Button></CollapsibleTrigger></div>
        </CardHeader>
        <CollapsibleContent asChild><CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Ativo</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {(types ?? []).map((type) => (
                  <TableRow key={type.code}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell><Switch checked={type.active} onCheckedChange={(active) => toggle.mutate({ code: type.code, active })} /></TableCell>
                    <TableCell className="space-x-1 text-right whitespace-nowrap">
                      <EditTypeDialog type={type} saving={update.isPending} onSave={(nextName) => update.mutateAsync({ code: type.code, name: nextName })} />
                       <LinkedRecordDeletionDialog entityId={type.code} entityName={type.name} entityLabel="tipo de etapa adicional" linkField="request_type" registry="additional_step_type" destinations={(types ?? []).filter((item) => item.active).map((item) => ({ id: item.code, name: item.name }))} onDelete={() => remove.mutate(type.code)} deleting={remove.isPending} />
                    </TableCell>
                  </TableRow>
                ))}
                {!types?.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum tipo cadastrado.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent></CollapsibleContent>
      </Card>
      </Collapsible>
  );
}

function EditTypeDialog({ type, saving, onSave }: { type: AdditionalStepType; saving: boolean; onSave: (name: string) => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(type.name);
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (nextOpen) setName(type.name); }}>
      <DialogTrigger asChild><Button size="icon" variant="ghost" title="Editar" aria-label="Editar"><Pencil className="h-4 w-4" /></Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar tipo</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); if (name.trim().length < 2) return toast.error("Nome muito curto"); try { await onSave(name.trim()); setOpen(false); } catch { /* A mensagem é exibida pela alteração. */ } }}>
          <div className="space-y-2"><Label htmlFor={`edit-${type.code}`}>Nome</Label><Input id={`edit-${type.code}`} value={name} onChange={(event) => setName(event.target.value)} required /></div>
          <DialogFooter><Button type="submit" disabled={saving}>Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
