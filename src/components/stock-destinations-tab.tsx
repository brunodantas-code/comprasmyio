import { useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronUp, ChevronDown, Pencil, Plus } from "lucide-react";
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

export type StockDestination = {
  code: string;
  name: string;
  position: number;
  active: boolean;
};

function makeCode(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function useStockDestinations() {
  return useQuery({
    queryKey: ["stock-destinations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_destinations").select("code,name,position,active").order("position").order("name");
      if (error) throw error;
      return data as StockDestination[];
    },
  });
}

export function StockDestinationsTab() {
  const qc = useQueryClient();
  const { data: destinations, isLoading } = useStockDestinations();
  const [createOpen, setCreateOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["stock-destinations"] });

  const create = useMutation({
    mutationFn: async ({ name, position }: { name: string; position: number }) => {
      const code = makeCode(name);
      if (!code) throw new Error("Informe um nome válido");
      const duplicate = destinations?.some((item) => item.code === code || item.name.trim().toLocaleLowerCase("pt-BR") === name.trim().toLocaleLowerCase("pt-BR"));
      if (duplicate) throw new Error("Este destino já está cadastrado");
      const { error } = await supabase.from("stock_destinations").insert({ code, name: name.trim(), position });
      if (error?.code === "23505") throw new Error("Este destino já está cadastrado");
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Destino criado"); setCreateOpen(false); invalidate(); },
    onError: (error: Error) => toast.error(error.message),
  });

  const update = useMutation({
    mutationFn: async ({ code, name, position }: { code: string; name: string; position: number }) => {
      const duplicate = destinations?.some((item) => item.code !== code && item.name.trim().toLocaleLowerCase("pt-BR") === name.trim().toLocaleLowerCase("pt-BR"));
      if (duplicate) throw new Error("Este destino já está cadastrado");
      const { error } = await supabase.from("stock_destinations").update({ name: name.trim(), position }).eq("code", code);
      if (error?.code === "23505") throw new Error("Este destino já está cadastrado");
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Destino atualizado"); invalidate(); },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ code, active }: { code: string; active: boolean }) => {
      const { error } = await supabase.from("stock_destinations").update({ active }).eq("code", code);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase.from("stock_destinations").delete().eq("code", code);
      if (error?.code === "23503") throw new Error("Este destino ainda possui dispositivos vinculados. Realoque-os antes de excluir.");
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Destino excluído"); invalidate(); },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded} asChild>
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div><CardTitle>Destinos de Estoque</CardTitle>{expanded && <CardDescription>Os destinos ativos ficam disponíveis nas movimentações de dispositivos.</CardDescription>}</div>
        <div className="flex items-center gap-1"><CollapsibleContent><DestinationDialog
          title="Novo destino de estoque"
          description="Cadastre uma nova opção para a lista de destinos."
          defaultPosition={Math.max(0, ...(destinations ?? []).map((item) => item.position)) + 1}
          saving={create.isPending}
          onSave={(name, position) => create.mutateAsync({ name, position })}
          trigger={<Button size="compactIcon" aria-label="Criar destino de estoque" title="Criar destino"><Plus className="h-3.5 w-3.5" /></Button>}
          open={createOpen}
          onOpenChange={setCreateOpen}
        /></CollapsibleContent><CollapsibleTrigger asChild><Button size="compactIcon" variant="ghost" aria-label={expanded ? "Recolher Destinos de Estoque" : "Expandir Destinos de Estoque"} title={expanded ? "Recolher" : "Expandir"}>{expanded ? <ChevronUp className="h-3.5 w-3.5"  /> : <ChevronDown className="h-3.5 w-3.5"  />}</Button></CollapsibleTrigger></div>
      </CardHeader>
      <CollapsibleContent asChild><CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Ordem</TableHead><TableHead>Ativo</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {(destinations ?? []).map((destination) => (
                <TableRow key={destination.code}>
                  <TableCell className="font-medium">{destination.name}</TableCell>
                  <TableCell>{destination.position}</TableCell>
                  <TableCell><Switch checked={destination.active} onCheckedChange={(active) => toggle.mutate({ code: destination.code, active })} /></TableCell>
                  <TableCell className="text-right"><div className="flex items-center justify-end gap-1">
                    <DestinationDialog
                      title="Editar destino de estoque"
                      defaultName={destination.name}
                      defaultPosition={destination.position}
                      saving={update.isPending}
                      onSave={(name, position) => update.mutateAsync({ code: destination.code, name, position })}
                      trigger={<Button size="compactIcon" variant="ghost" title={`Editar ${destination.name}`} aria-label={`Editar ${destination.name}`}><Pencil className="h-3.5 w-3.5" /></Button>}
                    />
                    <LinkedRecordDeletionDialog entityId={destination.code} entityName={destination.name} entityLabel="destino de estoque" linkField="request_type" registry="stock_destination" destinations={(destinations ?? []).filter((item) => item.active).map((item) => ({ id: item.code, name: item.name }))} onDelete={() => remove.mutate(destination.code)} deleting={remove.isPending} />
                  </div></TableCell>
                </TableRow>
              ))}
              {!destinations?.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum destino cadastrado.</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent></CollapsibleContent>
    </Card>
    </Collapsible>
  );
}

function DestinationDialog({ title, description, defaultName = "", defaultPosition, saving, onSave, trigger, open: controlledOpen, onOpenChange: controlledOnOpenChange }: {
  title: string;
  description?: string;
  defaultName?: string;
  defaultPosition: number;
  saving: boolean;
  onSave: (name: string, position: number) => Promise<unknown>;
  trigger: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [position, setPosition] = useState(String(defaultPosition));
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) { setName(defaultName); setPosition(String(defaultPosition)); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle>{description ? <DialogDescription>{description}</DialogDescription> : null}</DialogHeader>
        <form className="space-y-4" onSubmit={async (event) => {
          event.preventDefault();
          const order = Number(position);
          if (name.trim().length < 2) return toast.error("Nome muito curto");
          if (!Number.isInteger(order) || order < 0) return toast.error("Informe uma ordem válida");
          try { await onSave(name.trim(), order); setOpen(false); } catch { /* A alteração exibe a mensagem. */ }
        }}>
          <div className="space-y-2"><Label htmlFor={`stock-destination-name-${defaultName || "new"}`}>Nome</Label><Input id={`stock-destination-name-${defaultName || "new"}`} value={name} onChange={(event) => setName(event.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor={`stock-destination-position-${defaultName || "new"}`}>Ordem</Label><Input id={`stock-destination-position-${defaultName || "new"}`} type="number" min={0} step={1} value={position} onChange={(event) => setPosition(event.target.value)} required /></div>
          <DialogFooter><Button type="submit" disabled={saving}>Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}