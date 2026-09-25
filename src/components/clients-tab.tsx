import { Fragment, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronUp, ChevronDown, Download, Pencil, Plus, Trash2 } from "lucide-react";
import { LinkedRecordDeletionDialog } from "@/components/linked-record-deletion-dialog";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { useClientCategories, type ClientCategory } from "@/components/client-categories-tab";
import { ClientsMapDialog } from "@/components/clients-map-dialog";

export type Client = { id: string; name: string; legal_name: string | null; cnpj: string | null; city: string | null; state: string | null; category_id: string | null };
export type ClientUnit = { id: string; client_id: string; name: string; cnpj: string | null; city: string | null; state: string | null; category_id: string | null; active: boolean };
type NewClientUnit = { name: string; city: string; state: string };

const DUPLICATE_CLIENT_MESSAGE = "Este cliente já está cadastrado";
const BRAZILIAN_STATES = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
const normalizeSearchValue = (value: string | null | undefined) =>
  (value ?? "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function isDuplicateNameError(error: { code?: string }) {
  return error.code === "23505";
}

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id,name,legal_name,cnpj,city,state,category_id").order("name");
      if (error) throw error;
      return data as Client[];
    },
  });
}

export function useClientUnits(clientId?: string) {
  return useQuery({
    queryKey: ["client-units", clientId ?? "all"],
    queryFn: async () => {
      let query = supabase.from("client_units").select("id,client_id,name,cnpj,city,state,category_id,active").order("name");
      if (clientId) query = query.eq("client_id", clientId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ClientUnit[];
    },
  });
}

function useProjectsForReallocation() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function ClientsTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: clients, isLoading } = useClients();
  const { data: allClientUnits } = useClientUnits();
  const { data: reallocationProjects } = useProjectsForReallocation();
  const { data: categories } = useClientCategories(true);
  const [newUnits, setNewUnits] = useState<NewClientUnit[]>([]);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [clientSearch, setClientSearch] = useState("");
  const [clientSort, setClientSort] = useState<"name" | "category" | "state" | "city">("name");

  const normalizedSearch = normalizeSearchValue(clientSearch.trim());
  const activeClientsCount = clients?.length ?? 0;
  const activeUnitsCount = (allClientUnits ?? []).filter((unit) => unit.active).length;
  const totalActiveRecords = activeClientsCount + activeUnitsCount;
  const filteredClients = (clients ?? []).filter((client) => {
    if (!normalizedSearch) return true;
    const clientCategory = categories?.find((category) => category.id === client.category_id)?.name;
    const clientMatches = [client.name, client.legal_name, clientCategory, client.cnpj, client.city, client.state].some((value) =>
      normalizeSearchValue(value).includes(normalizedSearch),
    );
    const unitMatches = (allClientUnits ?? []).some((unit) =>
      unit.client_id === client.id && [unit.name, categories?.find((category) => category.id === unit.category_id)?.name, unit.cnpj, unit.city, unit.state].some((value) => normalizeSearchValue(value).includes(normalizedSearch)),
    );
    return clientMatches || unitMatches;
  }).sort((first, second) => {
    const categoryName = (client: Client) => categories?.find((category) => category.id === client.category_id)?.name ?? "";
    const firstValue = clientSort === "category" ? categoryName(first) : clientSort === "state" ? first.state ?? "" : clientSort === "city" ? first.city ?? "" : first.name;
    const secondValue = clientSort === "category" ? categoryName(second) : clientSort === "state" ? second.state ?? "" : clientSort === "city" ? second.city ?? "" : second.name;
    return firstValue.localeCompare(secondValue, "pt-BR", { sensitivity: "base" }) || first.name.localeCompare(second.name, "pt-BR", { sensitivity: "base" });
  });

  const create = useMutation({
    mutationFn: async (v: { name: string; legal_name: string | null; cnpj: string | null; city: string | null; state: string | null; category_id: string | null; units: NewClientUnit[] }) => {
      const { data: existing, error: lookupError } = await supabase.from("clients").select("id,name");
      if (lookupError) throw lookupError;
      const normalizedName = v.name.trim().toLocaleLowerCase("pt-BR");
      if (existing?.some((item) => item.name.trim().toLocaleLowerCase("pt-BR") === normalizedName)) {
        throw new Error(DUPLICATE_CLIENT_MESSAGE);
      }
      const { data: client, error } = await supabase
        .from("clients")
        .insert({ name: v.name, legal_name: v.legal_name, cnpj: v.cnpj, city: v.city, state: v.state, category_id: v.category_id, created_by: userId })
        .select("id")
        .single();
      if (error) throw new Error(isDuplicateNameError(error) ? DUPLICATE_CLIENT_MESSAGE : error.message);
      if (v.units.length) {
        const { error: unitsError } = await supabase.from("client_units").insert(
          v.units.map((unit) => ({ client_id: client.id, name: unit.name, city: unit.city || null, state: unit.state || null, category_id: v.category_id, created_by: userId })),
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
    mutationFn: async (v: { id: string; name: string; legal_name: string | null; cnpj: string | null; city: string | null; state: string | null; category_id: string | null }) => {
      const { data: existing, error: lookupError } = await supabase.from("clients").select("id,name");
      if (lookupError) throw lookupError;
      const normalizedName = v.name.trim().toLocaleLowerCase("pt-BR");
      if (existing?.some((item) => item.id !== v.id && item.name.trim().toLocaleLowerCase("pt-BR") === normalizedName)) {
        throw new Error(DUPLICATE_CLIENT_MESSAGE);
      }
      const { error } = await supabase.from("clients").update({ name: v.name, legal_name: v.legal_name, cnpj: v.cnpj, city: v.city, state: v.state, category_id: v.category_id }).eq("id", v.id);
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

  const convertToUnit = useMutation({
    mutationFn: async ({ sourceClientId, destinationClientId }: { sourceClientId: string; destinationClientId: string }) => {
      const { error } = await supabase.rpc("convert_client_to_unit", {
        _source_client_id: sourceClientId,
        _destination_client_id: destinationClientId,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Cliente convertido em unidade");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["clients"] }),
        qc.invalidateQueries({ queryKey: ["client-units"] }),
        qc.invalidateQueries({ queryKey: ["projects"] }),
        qc.invalidateQueries({ queryKey: ["orders"] }),
        qc.invalidateQueries({ queryKey: ["myio-orders"] }),
        qc.invalidateQueries({ queryKey: ["cash-flow-payables"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const legalName = String(fd.get("legal_name") || "").trim();
    const name = String(fd.get("name") || "").trim();
    const cnpj = String(fd.get("cnpj") || "").trim();
    const city = String(fd.get("city") || "").trim();
    const state = String(fd.get("state") || "").trim();
    const categoryId = String(fd.get("category_id") || "").trim();
    if (name.length < 2) return toast.error("Nome muito curto");
    const normalizedUnits = newUnits
      .map((unit) => ({ ...unit, name: unit.name.trim(), city: unit.city.trim() }))
      .filter((unit, index, list) => unit.name.length >= 2 && list.findIndex((item) => item.name.toLocaleLowerCase("pt-BR") === unit.name.toLocaleLowerCase("pt-BR")) === index);
    create.mutate({ name, legal_name: legalName || null, cnpj: cnpj || null, city: city || null, state: state || null, category_id: categoryId || null, units: normalizedUnits }, { onSuccess: () => form.reset() });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Novo cliente</CardTitle>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="whitespace-nowrap" onClick={() => setNewUnits((current) => [...current, { name: "", city: "", state: "" }])}>
              <Plus className="mr-1 h-4 w-4" />Filial
            </Button>
            <Button type="submit" form="new-client-form" className="whitespace-nowrap px-6" disabled={create.isPending}>Criar</Button>
          </div>
        </CardHeader>
        <CardContent>
          <form id="new-client-form" onSubmit={onCreate} className="space-y-4">
             <div className="grid items-end gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.15fr)_minmax(9rem,.7fr)_6rem_11rem_13rem]">
               <div className="grid min-w-0 grid-rows-[auto_2.25rem] gap-2"><Label htmlFor="c-legal-name">Razão social</Label><Input id="c-legal-name" name="legal_name" /></div>
               <div className="grid min-w-0 grid-rows-[auto_2.25rem] gap-2"><Label htmlFor="c-name">Nome fantasia</Label><Input id="c-name" name="name" required /></div>
               <div className="grid min-w-0 grid-rows-[auto_2.25rem] gap-2"><Label htmlFor="c-city">Cidade</Label><Input id="c-city" name="city" /></div>
               <div className="grid min-w-0 grid-rows-[auto_2.25rem] gap-2"><Label htmlFor="c-state">UF</Label><Select name="state"><SelectTrigger id="c-state" className="h-9"><SelectValue placeholder="UF" /></SelectTrigger><SelectContent>{BRAZILIAN_STATES.map((state) => <SelectItem key={state} value={state}>{state}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid min-w-0 grid-rows-[auto_2.25rem] gap-2"><Label htmlFor="c-category">Categoria</Label><Select name="category_id"><SelectTrigger id="c-category" className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{(categories ?? []).map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent></Select></div>
               <div className="grid min-w-0 grid-rows-[auto_2.25rem] gap-2"><Label htmlFor="c-cnpj">CNPJ</Label><Input id="c-cnpj" name="cnpj" placeholder="00.000.000/0000-00" maxLength={18} /></div>
            </div>
            {newUnits.length > 0 && (
              <div className="space-y-2">
                <Label>Filiais ou unidades</Label>
                 <div className="space-y-2">
                  {newUnits.map((unit, index) => (
                     <div key={index} className="grid grid-cols-[minmax(0,1fr)_6rem_auto] items-center gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem_auto]">
                      <Input
                         value={unit.name}
                         onChange={(event) => setNewUnits((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))}
                        placeholder="Nome da filial ou unidade"
                        aria-label={`Filial ou unidade ${index + 1}`}
                      />
                       <Input className="col-span-3 md:col-span-1 md:col-start-2 md:row-start-1" value={unit.city} onChange={(event) => setNewUnits((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, city: event.target.value } : item))} placeholder="Cidade" aria-label={`Cidade da unidade ${index + 1}`} />
                       <Select value={unit.state} onValueChange={(state) => setNewUnits((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, state } : item))}><SelectTrigger className="h-9" aria-label={`UF da unidade ${index + 1}`}><SelectValue placeholder="UF" /></SelectTrigger><SelectContent>{BRAZILIAN_STATES.map((state) => <SelectItem key={state} value={state}>{state}</SelectItem>)}</SelectContent></Select>
                      <ConfirmDeleteButton title="Remover unidade?" description={`Confirma a remoção de “${unit.name || `Unidade ${index + 1}`}” deste cadastro?`} ariaLabel="Remover unidade" confirmLabel="Remover" onConfirm={() => setNewUnits((current) => current.filter((_, itemIndex) => itemIndex !== index))} trigger={<Button type="button" variant="ghost" size="compactIcon" className="text-destructive hover:text-destructive" aria-label="Remover unidade" title="Remover unidade"><Trash2 className="h-3.5 w-3.5" /></Button>} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Clientes</CardTitle>
            <ClientsReportDialog clients={clients ?? []} units={allClientUnits ?? []} categories={categories ?? []} />
            <ClientsMapDialog clients={clients ?? []} units={allClientUnits ?? []} categories={categories ?? []} />
            <Select value={clientSort} onValueChange={(value: "name" | "category" | "state" | "city") => setClientSort(value)}>
              <SelectTrigger className="h-8 w-40" aria-label="Ordenar clientes"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Ordenar por nome</SelectItem>
                <SelectItem value="category">Ordenar por categoria</SelectItem>
                <SelectItem value="state">Ordenar por UF</SelectItem>
                <SelectItem value="city">Ordenar por cidade</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm" aria-label="Totais de clientes e unidades">
            <span><span className="font-semibold text-foreground">{activeClientsCount}</span>&nbsp;<span className="text-muted-foreground">clientes ativos</span></span>
            <span><span className="font-semibold text-foreground">{activeUnitsCount}</span>&nbsp;<span className="text-muted-foreground">unidades</span></span>
            <span className="inline-flex items-baseline gap-1 font-semibold text-foreground"><span>Total geral:</span><span className="text-[2em] leading-none">{totalActiveRecords}</span></span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
            !clients?.length ? <p className="text-sm text-muted-foreground">Sem clientes.</p> :
            <Table>
              <TableHeader>
                 <TableRow><TableHead>Nome fantasia</TableHead><TableHead>Razão social</TableHead><TableHead>Categoria</TableHead><TableHead>Cidade</TableHead><TableHead>UF</TableHead><TableHead>CNPJ</TableHead><TableHead className="w-20" /></TableRow>
                <TableRow className="bg-primary/5 hover:bg-primary/5">
                  <TableHead className="py-1">
                    <Input
                      value={clientSearch}
                      onChange={(event) => setClientSearch(event.target.value)}
                      placeholder="Filtrar clientes"
                      aria-label="Filtrar clientes por nome fantasia, razão social, categoria, cidade, UF ou CNPJ"
                      className="h-8 min-w-36 bg-background"
                    />
                  </TableHead>
                   <TableHead colSpan={6} />
                </TableRow>
              </TableHeader>
              <TableBody>
                 {!filteredClients.length ? <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</TableCell></TableRow> : filteredClients.map((c) => {
                  const unitMatchesSearch = Boolean(normalizedSearch) && (allClientUnits ?? []).some((unit) =>
                      unit.client_id === c.id && [unit.name, categories?.find((category) => category.id === unit.category_id)?.name, unit.cnpj, unit.city, unit.state].some((value) => normalizeSearchValue(value).includes(normalizedSearch)),
                  );
                  const expanded = expandedClients.has(c.id) || unitMatchesSearch;
                  const hasUnits = (allClientUnits ?? []).some((unit) => unit.client_id === c.id);
                  return (
                  <Fragment key={c.id}>
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {hasUnits && (
                            <Button
                              type="button"
                              size="compactIcon"
                              variant="ghost"
                              onClick={() => setExpandedClients((current) => {
                                const next = new Set(current);
                                if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
                                return next;
                              })}
                              title={expanded ? `Recolher unidades de ${c.name}` : `Exibir unidades de ${c.name}`}
                              aria-label={expanded ? `Recolher unidades de ${c.name}` : `Exibir unidades de ${c.name}`}
                            >
                              {expanded ? <ChevronUp className="h-3.5 w-3.5"  /> : <ChevronDown className="h-3.5 w-3.5"  />}
                            </Button>
                          )}
                          <span>{c.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.legal_name || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{categories?.find((category) => category.id === c.category_id)?.name || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.city || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.state || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.cnpj || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                          <EditClientDialog
                            client={c}
                            clients={clients ?? []}
                            categories={categories ?? []}
                            saving={update.isPending || convertToUnit.isPending}
                            onSave={(v) => update.mutateAsync({ id: c.id, ...v })}
                            onConvert={(destinationClientId) => convertToUnit.mutateAsync({ sourceClientId: c.id, destinationClientId })}
                          />
                       <LinkedRecordDeletionDialog
                         entityId={c.id}
                         entityName={c.name}
                         entityLabel="cliente"
                         linkField="client_id"
                          sourceEntityType="client"
                          destinations={[
                            ...(reallocationProjects ?? []).map((project) => ({ id: project.id, name: project.name, kind: "project" as const })),
                            ...(clients ?? []).map((client) => ({ id: client.id, name: client.name, kind: "client" as const })),
                            ...(allClientUnits ?? []).filter((unit) => unit.active).map((unit) => ({ id: unit.id, name: `${clients?.find((client) => client.id === unit.client_id)?.name ?? "Cliente"} — ${unit.name}`, kind: "unit" as const, parentClientId: unit.client_id })),
                          ]}
                         onDelete={() => remove.mutate(c.id)}
                         deleting={remove.isPending}
                          trigger={<Button type="button" size="compactIcon" variant="ghost" className="text-destructive hover:text-destructive" title={`Excluir ${c.name}`} aria-label={`Excluir ${c.name}`}><Trash2 className="h-3.5 w-3.5" /></Button>}
                       />
                        </div>
                      </TableCell>
                    </TableRow>
                    {hasUnits && expanded && <TableRow key={`${c.id}-units`} className="hover:bg-transparent"><TableCell colSpan={7} className="px-3 py-4 sm:px-6"><ClientUnitsList client={c} userId={userId} /></TableCell></TableRow>}
                  </Fragment>
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
  const { data: categories } = useClientCategories(true);
  const create = useMutation({
    mutationFn: async (values: { name: string; cnpj: string | null; city: string | null; state: string | null; category_id: string | null }) => {
      const { error } = await supabase.from("client_units").insert({ client_id: client.id, name: values.name, cnpj: values.cnpj, city: values.city, state: values.state, category_id: values.category_id, created_by: userId });
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
    mutationFn: async ({ id, name, cnpj, city, state, category_id }: { id: string; name: string; cnpj: string | null; city: string | null; state: string | null; category_id: string | null }) => {
      const { error } = await supabase.from("client_units").update({ name, cnpj, city, state, category_id }).eq("id", id);
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
          categories={categories ?? []}
          saving={create.isPending}
          onSave={(values) => create.mutateAsync(values)}
          trigger={<Button type="button" size="sm"><Plus className="mr-1 h-4 w-4" />Adicionar unidade</Button>}
        />
      </div>
      {!units?.length ? <p className="text-sm text-muted-foreground">Nenhuma unidade cadastrada.</p> : (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Categoria</TableHead><TableHead>Cidade</TableHead><TableHead>UF</TableHead><TableHead>CNPJ</TableHead><TableHead>Status</TableHead><TableHead className="w-20" /></TableRow></TableHeader>
            <TableBody>
              {(units ?? []).map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell className="font-medium">{unit.name}</TableCell>
                  <TableCell className="text-muted-foreground">{categories?.find((category) => category.id === unit.category_id)?.name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{unit.city || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{unit.state || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{unit.cnpj || "—"}</TableCell>
                  <TableCell><Button type="button" variant="outline" size="sm" disabled={toggle.isPending} onClick={() => toggle.mutate(unit)}>{unit.active ? "Ativa" : "Inativa"}</Button></TableCell>
                  <TableCell className="text-right"><div className="flex items-center justify-end gap-1 whitespace-nowrap">
                    <UnitDialog
                      title={`Editar ${unit.name}`}
                      unit={unit}
                      categories={categories ?? []}
                      saving={update.isPending}
                      onSave={(values) => update.mutateAsync({ id: unit.id, ...values })}
                      trigger={<Button type="button" size="compactIcon" variant="ghost" title={`Editar ${unit.name}`} aria-label={`Editar ${unit.name}`}><Pencil className="h-3.5 w-3.5" /></Button>}
                    />
                    <ConfirmDeleteButton
                      title="Excluir unidade"
                      description={`Confirma a exclusão de “${unit.name}”?`}
                      pending={remove.isPending}
                      onConfirm={() => remove.mutate(unit.id)}
                      ariaLabel={`Excluir ${unit.name}`}
                      trigger={<Button type="button" size="compactIcon" variant="ghost" className="text-destructive hover:text-destructive" title={`Excluir ${unit.name}`} aria-label={`Excluir ${unit.name}`}><Trash2 className="h-3.5 w-3.5" /></Button>}
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

function UnitDialog({ title, unit, categories, saving, onSave, trigger }: { title: string; unit?: ClientUnit; categories: ClientCategory[]; saving: boolean; onSave: (values: { name: string; cnpj: string | null; city: string | null; state: string | null; category_id: string | null }) => Promise<unknown>; trigger: React.ReactNode }) {
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
           const city = String(formData.get("city") || "").trim();
           const state = String(formData.get("state") || "").trim();
            const categoryId = String(formData.get("category_id") || "").trim();
          if (name.length < 2) return toast.error("Informe o nome da unidade");
            try { await onSave({ name, cnpj: cnpj || null, city: city || null, state: state || null, category_id: categoryId === "none" ? null : categoryId || null }); setOpen(false); } catch { /* A alteração exibe a mensagem. */ }
        }}>
          <div className="space-y-2"><Label>Nome da unidade</Label><Input name="name" defaultValue={unit?.name ?? ""} required /></div>
           <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
             <div className="grid grid-rows-[auto_2.25rem] gap-2"><Label>Cidade</Label><Input name="city" defaultValue={unit?.city ?? ""} /></div>
             <div className="grid grid-rows-[auto_2.25rem] gap-2"><Label>UF</Label><Select name="state" defaultValue={unit?.state ?? undefined}><SelectTrigger className="h-9"><SelectValue placeholder="UF" /></SelectTrigger><SelectContent>{BRAZILIAN_STATES.map((state) => <SelectItem key={state} value={state}>{state}</SelectItem>)}</SelectContent></Select></div>
           </div>
           <div className="space-y-2"><Label>Categoria</Label><Select name="category_id" defaultValue={unit?.category_id ?? "none"}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="none">Sem categoria</SelectItem>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>CNPJ</Label><Input name="cnpj" defaultValue={unit?.cnpj ?? ""} placeholder="00.000.000/0000-00" /></div>
          <DialogFooter><Button type="submit" disabled={saving}>Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type ClientReportOrder = "state" | "category" | "corporate";

function ClientsReportDialog({ clients, units, categories }: { clients: Client[]; units: ClientUnit[]; categories: ClientCategory[] }) {
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<ClientReportOrder>("state");
  const [exporting, setExporting] = useState(false);

  async function exportPdf() {
    setExporting(true);
    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const autoTable = autoTableModule.default;
      const categoryName = (id: string | null) => categories.find((category) => category.id === id)?.name ?? "Sem categoria";
      const activeUnits = units.filter((unit) => unit.active);
      const clientIdsWithActiveUnits = new Set(activeUnits.map((unit) => unit.client_id));
      const standaloneClients = clients.filter((client) => !clientIdsWithActiveUnits.has(client.id));
      const rows = clients.flatMap((client) => {
        const corporate = [client.name, client.legal_name || "—", categoryName(client.category_id), client.city || "—", client.state || "—", client.cnpj || "—", "Corporativo", client.name];
        const clientUnits = units.filter((unit) => unit.client_id === client.id).map((unit) => [unit.name, "—", categoryName(unit.category_id), unit.city || "—", unit.state || "—", unit.cnpj || "—", unit.active ? "Unidade ativa" : "Unidade inativa", client.name]);
        return [corporate, ...clientUnits];
      });
      const summarize = (getClientGroup: (client: Client) => string, getUnitGroup: (unit: ClientUnit) => string) => {
        const summary = new Map<string, { clients: number; units: number }>();
        standaloneClients.forEach((client) => {
          const group = getClientGroup(client);
          const current = summary.get(group) ?? { clients: 0, units: 0 };
          current.clients += 1;
          summary.set(group, current);
        });
        activeUnits.forEach((unit) => {
          const group = getUnitGroup(unit);
          const current = summary.get(group) ?? { clients: 0, units: 0 };
          current.units += 1;
          summary.set(group, current);
        });
        return [...summary.entries()]
          .sort(([a], [b]) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }))
          .map(([group, totals]) => [group, totals.clients, totals.units, totals.clients + totals.units]);
      };
      const stateSummary = summarize((client) => client.state || "Sem UF", (unit) => unit.state || "Sem UF");
      const categorySummary = summarize((client) => categoryName(client.category_id), (unit) => categoryName(unit.category_id));
      const orderIndex = order === "state" ? 4 : order === "category" ? 2 : 7;
      rows.sort((a, b) => String(a[orderIndex]).localeCompare(String(b[orderIndex]), "pt-BR", { sensitivity: "base" }) || String(a[0]).localeCompare(String(b[0]), "pt-BR", { sensitivity: "base" }));
      const orderLabel = order === "state" ? "UF" : order === "category" ? "Categoria" : "Cliente corporativo";
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFontSize(16);
      doc.text("Relatório de Clientes", 14, 15);
      doc.setFontSize(9);
      doc.text(`Ordenação: ${orderLabel} | ${standaloneClients.length} clientes sem unidades | ${activeUnits.length} unidades | Total: ${standaloneClients.length + activeUnits.length}`, 14, 21);
      doc.setFontSize(11);
      doc.text("Totalizadores por UF", 10, 31);
      doc.text("Totalizadores por categoria", 154, 31);
      const summaryTable = {
        startY: 35,
        head: [["Grupo", "Clientes", "Unidades", "Total"]],
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [20, 184, 130] as [number, number, number], textColor: [0, 0, 0] as [number, number, number], fontStyle: "bold" as const },
        alternateRowStyles: { fillColor: [244, 248, 247] as [number, number, number] },
        tableWidth: 133,
      };
      autoTable(doc, { ...summaryTable, body: stateSummary, margin: { left: 10, right: 154 } });
      autoTable(doc, { ...summaryTable, body: categorySummary, margin: { left: 154, right: 10 } });
      doc.addPage();
      doc.setFontSize(12);
      doc.text("Relação completa de clientes e unidades", 14, 12);
      autoTable(doc, {
        startY: 16,
        head: [["Nome fantasia / Unidade", "Razão social", "Categoria", "Cidade", "UF", "CNPJ", "Tipo / Status", "Cliente corporativo"]],
        body: rows,
        styles: { fontSize: 7, cellPadding: 1.8, overflow: "linebreak" },
        headStyles: { fillColor: [20, 184, 130], textColor: [0, 0, 0], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [244, 248, 247] },
        columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 48 }, 2: { cellWidth: 25 }, 3: { cellWidth: 28 }, 4: { cellWidth: 10 }, 5: { cellWidth: 31 }, 6: { cellWidth: 24 }, 7: { cellWidth: 35 } },
        margin: { left: 10, right: 10 },
      });
      doc.save(`relatorio-clientes-${order}.pdf`);
      setOpen(false);
      toast.success("Relatório PDF gerado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o relatório");
    } finally {
      setExporting(false);
    }
  }

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button type="button" size="compactIcon" variant="ghost" title="Exportar relatório PDF" aria-label="Exportar relatório PDF"><Download /></Button></DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>Relatório de clientes</DialogTitle></DialogHeader>
      <div className="space-y-2"><Label>Ordenar por</Label><Select value={order} onValueChange={(value) => setOrder(value as ClientReportOrder)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="state">UF</SelectItem><SelectItem value="category">Categoria</SelectItem><SelectItem value="corporate">Cliente corporativo</SelectItem></SelectContent></Select></div>
      <DialogFooter><Button type="button" onClick={() => void exportPdf()} disabled={exporting}><Download className="mr-2 h-4 w-4" />{exporting ? "Gerando..." : "Exportar PDF"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function EditClientDialog({ client, clients, categories, saving, onSave, onConvert }: {
  client: Client;
  clients: Client[];
  categories: ClientCategory[];
  saving: boolean;
  onSave: (v: { name: string; legal_name: string | null; cnpj: string | null; city: string | null; state: string | null; category_id: string | null }) => Promise<unknown>;
  onConvert: (destinationClientId: string) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [corporateClientId, setCorporateClientId] = useState("none");
  const [confirmConversion, setConfirmConversion] = useState(false);
  const [pendingValues, setPendingValues] = useState<{ name: string; legal_name: string | null; cnpj: string | null; city: string | null; state: string | null; category_id: string | null } | null>(null);
  const corporateClient = clients.find((item) => item.id === corporateClientId);

  async function saveEdit(values: { name: string; legal_name: string | null; cnpj: string | null; city: string | null; state: string | null; category_id: string | null }) {
    try {
      await onSave(values);
      setOpen(false);
    } catch { /* A alteração exibe a mensagem. */ }
  }

  async function convertClient() {
    if (!corporateClient || !pendingValues) return;
    try {
      await onSave(pendingValues);
      await onConvert(corporateClient.id);
      setConfirmConversion(false);
      setOpen(false);
      setCorporateClientId("none");
      setPendingValues(null);
    } catch { /* A alteração exibe a mensagem. */ }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setCorporateClientId("none"); }}>
      <DialogTrigger asChild>
        <Button size="compactIcon" variant="ghost" title="Editar" aria-label="Editar">
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
            const legalName = String(fd.get("legal_name") || "").trim();
            const name = String(fd.get("name") || "").trim();
            const cnpj = String(fd.get("cnpj") || "").trim();
            const city = String(fd.get("city") || "").trim();
            const state = String(fd.get("state") || "").trim();
            const categoryId = String(fd.get("category_id") || "").trim();
            if (name.length < 2) return toast.error("Nome muito curto");
            const values = { name, legal_name: legalName || null, cnpj: cnpj || null, city: city || null, state: state || null, category_id: categoryId === "none" ? null : categoryId || null };
            if (corporateClientId !== "none") {
              setPendingValues(values);
              setConfirmConversion(true);
              return;
            }
            void saveEdit(values);
          }}
        >
          <div className="space-y-2"><Label>Razão social</Label><Input name="legal_name" defaultValue={client.legal_name ?? ""} /></div>
          <div className="space-y-2"><Label>Nome fantasia</Label><Input name="name" defaultValue={client.name} required /></div>
          <div className="space-y-2"><Label>Categoria</Label><Select name="category_id" defaultValue={client.category_id ?? "none"}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="none">Sem categoria</SelectItem>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
            <div className="space-y-2"><Label>Cidade</Label><Input name="city" defaultValue={client.city ?? ""} /></div>
            <div className="space-y-2"><Label>UF</Label><Select name="state" defaultValue={client.state ?? undefined}><SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger><SelectContent>{BRAZILIAN_STATES.map((state) => <SelectItem key={state} value={state}>{state}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="space-y-2"><Label>CNPJ</Label><Input name="cnpj" defaultValue={client.cnpj ?? ""} maxLength={18} /></div>
          <div className="space-y-2">
            <Label>Cliente corporativo</Label>
            <Select value={corporateClientId} onValueChange={setCorporateClientId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Manter como cliente corporativo</SelectItem>
                {clients.filter((item) => item.id !== client.id).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Selecione uma matriz para transformar este cliente em filial ou unidade.</p>
          </div>
          <DialogFooter><Button type="submit" disabled={saving}>Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <AlertDialog open={confirmConversion} onOpenChange={setConfirmConversion}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Converter cliente em unidade?</AlertDialogTitle>
          <AlertDialogDescription>
            “{client.name}” passará a ser uma unidade de “{corporateClient?.name}”. Projetos, solicitações e lançamentos serão transferidos automaticamente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={saving} onClick={(event) => { event.preventDefault(); void convertClient(); }}>Confirmar conversão</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
