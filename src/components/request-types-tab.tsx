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
import { LinkedRecordDeletionDialog } from "@/components/linked-record-deletion-dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export type RequestTypeRecord = { code: string; name: string; active: boolean; position: number; model_code: string; is_system: boolean };

export const REQUEST_TYPE_FALLBACKS: Record<string, string> = {
  materiais: "Materiais",
  servicos: "Serviços",
  viagens: "Viagens",
  reembolso: "Reembolsos",
  pagamento: "Pagamento",
  rh: "Contratação de RH",
  importacao: "Importação",
  dispositivos: "Dispositivos",
};

export function useRequestTypes() {
  return useQuery({
    queryKey: ["request-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("request_types").select("code,name,active,position,model_code,is_system").order("position");
      if (error) throw error;
      return data as RequestTypeRecord[];
    },
  });
}

export function requestTypeName(code: string | null | undefined, types?: RequestTypeRecord[]) {
  if (!code) return "—";
  return types?.find((type) => type.code === code)?.name ?? REQUEST_TYPE_FALLBACKS[code] ?? code;
}

export function requestTypeModel(code: string | null | undefined, types?: RequestTypeRecord[]) {
  if (!code) return "materiais";
  return types?.find((type) => type.code === code)?.model_code ?? code;
}

function makeCode(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function RequestTypesTab() {
  const qc = useQueryClient();
  const { data: types, isLoading } = useRequestTypes();
  const [createOpen, setCreateOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["request-types"] });

  const create = useMutation({
    mutationFn: async ({ name, modelCode }: { name: string; modelCode: string }) => {
      const code = makeCode(name);
      if (!code) throw new Error("Informe um nome válido");
      const normalized = name.trim().toLocaleLowerCase("pt-BR");
      if (types?.some((type) => type.name.trim().toLocaleLowerCase("pt-BR") === normalized || type.code === code)) throw new Error("Este tipo de solicitação já está cadastrado");
      const position = Math.max(0, ...(types ?? []).map((type) => type.position)) + 1;
      const { error } = await supabase.from("request_types").insert({ code, name: name.trim(), model_code: modelCode, position });
      if (error?.code === "23505") throw new Error("Este tipo de solicitação já está cadastrado");
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Tipo criado"); setCreateOpen(false); invalidate(); },
    onError: (error: Error) => toast.error(error.message),
  });

  const update = useMutation({
    mutationFn: async ({ code, name }: { code: string; name: string }) => {
      const normalized = name.trim().toLocaleLowerCase("pt-BR");
      if (types?.some((type) => type.code !== code && type.name.trim().toLocaleLowerCase("pt-BR") === normalized)) {
        throw new Error("Este tipo de solicitação já está cadastrado");
      }
      const { error } = await supabase.from("request_types").update({ name: name.trim() }).eq("code", code);
      if (error?.code === "23505") throw new Error("Este tipo de solicitação já está cadastrado");
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Tipo atualizado"); invalidate(); },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ code, active }: { code: string; active: boolean }) => {
      const { error } = await supabase.from("request_types").update({ active }).eq("code", code);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase.from("request_types").delete().eq("code", code);
      if (error?.code === "23503") throw new Error("Este tipo ainda possui vínculos. Realoque-os antes de excluir.");
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Tipo excluído"); invalidate(); },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded} asChild>
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div><CardTitle>Tipos de Solicitação</CardTitle>{expanded && <CardDescription>Crie tipos a partir de um modelo de formulário existente.</CardDescription>}</div>
        <div className="flex items-center gap-1">
          <CollapsibleContent><CreateRequestTypeDialog open={createOpen} onOpenChange={setCreateOpen} saving={create.isPending} onSave={(name, modelCode) => create.mutateAsync({ name, modelCode })} /></CollapsibleContent>
          <CollapsibleTrigger asChild><Button size="compactIcon" variant="ghost" aria-label={expanded ? "Recolher Tipos de Solicitação" : "Expandir Tipos de Solicitação"} title={expanded ? "Recolher" : "Expandir"}>{expanded ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}</Button></CollapsibleTrigger>
        </div>
      </CardHeader>
      <CollapsibleContent asChild><CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Modelo</TableHead><TableHead>Ativo</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {(types ?? []).map((type) => (
                <TableRow key={type.code}>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell>{REQUEST_TYPE_FALLBACKS[type.model_code] ?? type.model_code}</TableCell>
                  <TableCell><Switch checked={type.active} onCheckedChange={(active) => toggle.mutate({ code: type.code, active })} /></TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <EditRequestTypeDialog type={type} saving={update.isPending} onSave={(name) => update.mutateAsync({ code: type.code, name })} />
                      <LinkedRecordDeletionDialog
                        entityId={type.code}
                        entityName={type.name}
                        entityLabel="tipo de solicitação"
                        linkField="request_type"
                        registry="request_type"
                        destinations={(types ?? []).filter((item) => item.active).map((item) => ({ id: item.code, name: item.name }))}
                        deleteBlockedReason={type.is_system ? "Este é um tipo estrutural do sistema. Ele pode ser editado ou desativado, mas não excluído." : undefined}
                        onDelete={() => remove.mutate(type.code)}
                        deleting={remove.isPending}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!types?.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum tipo cadastrado.</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent></CollapsibleContent>
    </Card>
    </Collapsible>
  );
}

function CreateRequestTypeDialog({ open, onOpenChange, saving, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; saving: boolean; onSave: (name: string, modelCode: string) => Promise<unknown> }) {
  const [name, setName] = useState("");
  const [modelCode, setModelCode] = useState("");
  return <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) { setName(""); setModelCode(""); } }}>
    <DialogTrigger asChild><Button size="compactIcon" aria-label="Criar tipo de solicitação" title="Criar tipo"><Plus className="h-3.5 w-3.5" /></Button></DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>Novo tipo de solicitação</DialogTitle><DialogDescription>Escolha o formulário e as regras que este tipo reutilizará.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); if (name.trim().length < 2) return toast.error("Nome muito curto"); if (!modelCode) return toast.error("Selecione um modelo"); try { await onSave(name.trim(), modelCode); } catch { /* A alteração exibe a mensagem. */ } }}>
        <div className="space-y-2"><Label htmlFor="new-request-type-name">Nome</Label><Input id="new-request-type-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Inserir nome" required /></div>
        <div className="space-y-2"><Label>Modelo</Label><Select value={modelCode} onValueChange={setModelCode}><SelectTrigger><SelectValue placeholder="Selecione o modelo" /></SelectTrigger><SelectContent>{Object.entries(REQUEST_TYPE_FALLBACKS).map(([code, label]) => <SelectItem key={code} value={code}>{label}</SelectItem>)}</SelectContent></Select></div>
        <DialogFooter><Button type="submit" disabled={saving}>Criar</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

function EditRequestTypeDialog({ type, saving, onSave }: { type: RequestTypeRecord; saving: boolean; onSave: (name: string) => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(type.name);
  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) setName(type.name); }}>
      <DialogTrigger asChild><Button size="compactIcon" variant="ghost" title="Editar" aria-label={`Editar ${type.name}`}><Pencil className="h-3.5 w-3.5" /></Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar Tipo de Solicitação</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={async (event) => {
          event.preventDefault();
          if (name.trim().length < 2) return toast.error("Nome muito curto");
          try { await onSave(name.trim()); setOpen(false); } catch { /* A alteração exibe a mensagem. */ }
        }}>
          <div className="space-y-2"><Label htmlFor={`request-type-${type.code}`}>Nome</Label><Input id={`request-type-${type.code}`} value={name} onChange={(event) => setName(event.target.value)} required /></div>
          <DialogFooter><Button type="submit" disabled={saving}>Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}