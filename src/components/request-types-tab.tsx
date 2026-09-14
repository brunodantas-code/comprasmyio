import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type RequestTypeRecord = { code: string; name: string; active: boolean; position: number };

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
      const { data, error } = await supabase.from("request_types").select("code,name,active,position").order("position");
      if (error) throw error;
      return data as RequestTypeRecord[];
    },
  });
}

export function requestTypeName(code: string | null | undefined, types?: RequestTypeRecord[]) {
  if (!code) return "—";
  return types?.find((type) => type.code === code)?.name ?? REQUEST_TYPE_FALLBACKS[code] ?? code;
}

export function RequestTypesTab() {
  const qc = useQueryClient();
  const { data: types, isLoading } = useRequestTypes();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["request-types"] });

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tipos de Solicitação</CardTitle>
        <CardDescription>Edite os nomes exibidos ou desative tipos para impedir novas solicitações.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Ativo</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {(types ?? []).map((type) => (
                <TableRow key={type.code}>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell><Switch checked={type.active} onCheckedChange={(active) => toggle.mutate({ code: type.code, active })} /></TableCell>
                  <TableCell className="text-right">
                    <EditRequestTypeDialog type={type} saving={update.isPending} onSave={(name) => update.mutateAsync({ code: type.code, name })} />
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

function EditRequestTypeDialog({ type, saving, onSave }: { type: RequestTypeRecord; saving: boolean; onSave: (name: string) => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(type.name);
  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) setName(type.name); }}>
      <DialogTrigger asChild><Button size="icon" variant="ghost" title="Editar" aria-label={`Editar ${type.name}`}><Pencil className="h-4 w-4" /></Button></DialogTrigger>
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