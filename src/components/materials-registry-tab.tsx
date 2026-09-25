import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronUp, ChevronDown, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { MaterialDetailDialog } from "@/components/material-detail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useMaterialStockTypes, type MaterialStockType } from "@/components/material-stock-types-tab";

type MaterialSource = "materials" | "terceiros_materials" | "tool_assets";

type RegistryMaterial = {
  id: string;
  name: string;
  description: string | null;
  manufacturer_code: string | null;
  source: MaterialSource;
  group: string;
  stock_type_code: string | null;
  location?: string | null;
};

const normalize = (value: string | null) => (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

function useRegistryMaterials(categoryNames: Map<string, string>) {
  return useQuery({
    queryKey: ["materials-registry"],
    queryFn: async () => {
      const [{ data: materials, error: materialsError }, { data: terceiros, error: terceirosError }, { data: tools, error: toolsError }] = await Promise.all([
        supabase.from("materials").select("id,name,description,manufacturer_code,location,stock_type_code").in("location", ["fabrica", "almoxarifado"]).eq("is_manufactured", false).order("name"),
        supabase.from("terceiros_materials").select("id,name,description,manufacturer_code,stock_type_code").order("name"),
        supabase.from("tool_assets").select("id,name,description,manufacturer_code,stock_type_code").order("name"),
      ]);
      if (materialsError) throw materialsError;
      if (terceirosError) throw terceirosError;
      if (toolsError) throw toolsError;

      return [
        ...(materials ?? []).map((item) => ({ ...item, source: "materials" as const, group: categoryNames.get(item.stock_type_code ?? "") ?? (item.location === "fabrica" ? "Insumos de Fabricação" : "Material de Almoxarifado") })),
        ...(terceiros ?? []).map((item) => ({ ...item, source: "terceiros_materials" as const, group: categoryNames.get(item.stock_type_code ?? "") ?? "Insumos de Instalação" })),
        ...(tools ?? []).map((item) => ({ ...item, source: "tool_assets" as const, group: categoryNames.get(item.stock_type_code ?? "") ?? "Máquinas e Ferramentas" })),
      ] satisfies RegistryMaterial[];
    },
  });
}

function useMyioDevices() {
  return useQuery({
    queryKey: ["myio-devices-registry"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id,name,description,manufacturer_code,location,stock_type_code")
        .eq("is_manufactured", true)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((item) => ({ ...item, source: "materials" as const, group: "Dispositivos myio" })) satisfies RegistryMaterial[];
    },
  });
}

function DeleteMaterialButton({ material }: { material: RegistryMaterial }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from(material.source).delete().eq("id", material.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Material excluído");
      setOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["materials-registry"] }),
        queryClient.invalidateQueries({ queryKey: ["materials"] }),
        queryClient.invalidateQueries({ queryKey: ["purchasable-items"] }),
        queryClient.invalidateQueries({ queryKey: ["material-stock"] }),
        queryClient.invalidateQueries({ queryKey: ["terceiros-stock"] }),
        queryClient.invalidateQueries({ queryKey: ["tool-stock"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message.includes("foreign key") || error.message.includes("constraint") ? "Este material possui vínculos e não pode ser excluído." : error.message),
  });

  return <AlertDialog open={open} onOpenChange={setOpen}>
    <AlertDialogTrigger asChild>
      <Button variant="ghost" size="compactIcon" className="!h-6 !w-6 shrink-0 text-destructive hover:text-destructive" title={`Excluir ${material.name}`} aria-label={`Excluir ${material.name}`}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Excluir material</AlertDialogTitle>
        <AlertDialogDescription>Confirma a exclusão de “{material.name}”? O histórico de movimentações desse item também será removido.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction disabled={remove.isPending} onClick={() => remove.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

function AddMaterialDialog({ categories }: { categories: MaterialStockType[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [categoryCode, setCategoryCode] = useState(categories[0]?.code ?? "");
  const [description, setDescription] = useState("");
  const [manufacturerCode, setManufacturerCode] = useState("");

  const reset = () => {
    setName("");
    setCategoryCode(categories[0]?.code ?? "");
    setDescription("");
    setManufacturerCode("");
  };

  const create = useMutation({
    mutationFn: async () => {
      const materialName = name.trim();
      if (!materialName) throw new Error("Informe o nome do material");
      const category = categories.find((item) => item.code === categoryCode);
      if (!category) throw new Error("Selecione uma categoria de material");
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("Usuário não identificado");
      const common = {
        name: materialName,
        description: description.trim() || null,
        manufacturer_code: manufacturerCode.trim() || null,
        created_by: authData.user.id,
      };
      const result = category.destination_type === "terceiros"
        ? await supabase.from("terceiros_materials").insert({ ...common, stock_type_code: category.code } as never)
        : category.destination_type === "ferramentas"
          ? await supabase.from("tool_assets").insert({ ...common, stock_type_code: category.code } as never)
          : await supabase.from("materials").insert({
              ...common,
              location: category.destination_type,
              stock_type_code: category.code,
              ...(category.destination_type === "fabrica" ? { is_product: false, is_manufactured: false } : {}),
            });
      if (result.error) throw result.error;
    },
    onSuccess: async () => {
      toast.success("Material adicionado");
      setOpen(false);
      reset();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["materials-registry"] }),
        queryClient.invalidateQueries({ queryKey: ["materials"] }),
        queryClient.invalidateQueries({ queryKey: ["purchasable-items"] }),
        queryClient.invalidateQueries({ queryKey: ["material-stock"] }),
        queryClient.invalidateQueries({ queryKey: ["terceiros-stock"] }),
        queryClient.invalidateQueries({ queryKey: ["tool-stock"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) reset(); }}>
    <DialogTrigger asChild>
      <Button size="compactIcon" aria-label="Adicionar material" title="Adicionar material"><Plus className="h-3.5 w-3.5" /></Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo material</DialogTitle>
        <DialogDescription>Cadastre o item na categoria de estoque correspondente.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
        <div className="space-y-1.5">
          <Label htmlFor="registry-material-name">Material</Label>
          <Input id="registry-material-name" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Select value={categoryCode} onValueChange={setCategoryCode}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map((category) => <SelectItem key={category.code} value={category.code}>{category.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="registry-material-description">Descrição</Label>
          <Input id="registry-material-description" value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="registry-material-code">Código do Fabricante</Label>
          <Input id="registry-material-code" value={manufacturerCode} onChange={(event) => setManufacturerCode(event.target.value)} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="submit" disabled={create.isPending}>{create.isPending ? "Salvando..." : "Adicionar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

export function MaterialsRegistryTab({ canCreate = false }: { canCreate?: boolean }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const { data: stockTypes = [] } = useMaterialStockTypes();
  const activeCategories = stockTypes.filter((item) => item.active);
  const categoryNames = useMemo(() => new Map(stockTypes.map((item) => [item.code, item.name])), [stockTypes]);
  const { data: materials = [], isLoading } = useRegistryMaterials(categoryNames);
  const classify = useMutation({
    mutationFn: async ({ material, category }: { material: RegistryMaterial; category: MaterialStockType }) => {
      const compatible = material.source === "materials"
        ? category.destination_type === "fabrica" || category.destination_type === "almoxarifado"
        : material.source === "terceiros_materials"
          ? category.destination_type === "terceiros"
          : category.destination_type === "ferramentas";
      if (!compatible) throw new Error("Esta categoria pertence a outro tipo de estoque e não pode ser aplicada a este material.");
      const values = material.source === "materials"
        ? { stock_type_code: category.code, location: category.destination_type }
        : { stock_type_code: category.code };
      const { error } = await supabase.from(material.source).update(values as never).eq("id", material.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Categoria atualizada");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["materials-registry"] }),
        queryClient.invalidateQueries({ queryKey: ["materials"] }),
        queryClient.invalidateQueries({ queryKey: ["purchasable-items"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const filtered = useMemo(() => {
    const term = normalize(search.trim());
    if (!term) return materials;
    return materials.filter((item) => normalize(`${item.name} ${item.description ?? ""} ${item.manufacturer_code ?? ""} ${item.group}`).includes(term));
  }, [materials, search]);

  return <Collapsible open={expanded} onOpenChange={setExpanded} asChild>
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Materiais</CardTitle>
          {expanded && <CardDescription>Itens cadastrados e disponíveis para novas solicitações.</CardDescription>}
        </div>
        <div className="flex items-center gap-1">
          {canCreate && <CollapsibleContent><AddMaterialDialog categories={activeCategories} /></CollapsibleContent>}
          <CollapsibleTrigger asChild>
            <Button size="compactIcon" variant="ghost" aria-label={expanded ? "Recolher Materiais" : "Expandir Materiais"} title={expanded ? "Recolher" : "Expandir"}>
              {expanded ? <ChevronUp className="h-3.5 w-3.5"  /> : <ChevronDown className="h-3.5 w-3.5"  />}
            </Button>
          </CollapsibleTrigger>
        </div>
      </CardHeader>
      <CollapsibleContent asChild>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar material..." className="pl-9" />
          </div>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : !filtered.length ? <p className="text-sm text-muted-foreground">Nenhum material encontrado.</p> : <Table>
            <TableHeader><TableRow><TableHead>Material</TableHead><TableHead>Categoria</TableHead><TableHead>Cód. Fabricante</TableHead><TableHead className="w-16" /></TableRow></TableHeader>
            <TableBody>{filtered.map((material) => <TableRow key={`${material.source}:${material.id}`}>
              <TableCell><div className="font-medium">{material.name}</div>{material.description && <div className="max-w-xl truncate text-xs text-muted-foreground">{material.description}</div>}</TableCell>
               <TableCell>
                 <Select
                   value={material.stock_type_code ?? ""}
                   onValueChange={(code) => {
                     const category = activeCategories.find((item) => item.code === code);
                     if (category) classify.mutate({ material, category });
                   }}
                   disabled={classify.isPending}
                 >
                   <SelectTrigger className="max-w-64" aria-label={`Categoria de ${material.name}`}><SelectValue placeholder={material.group} /></SelectTrigger>
                   <SelectContent>
                     {activeCategories.filter((category) => material.source === "materials"
                       ? category.destination_type === "fabrica" || category.destination_type === "almoxarifado"
                       : material.source === "terceiros_materials"
                         ? category.destination_type === "terceiros"
                         : category.destination_type === "ferramentas").map((category) => <SelectItem key={category.code} value={category.code}>{category.name}</SelectItem>)}
                   </SelectContent>
                 </Select>
               </TableCell>
              <TableCell>{material.manufacturer_code || "—"}</TableCell>
              <TableCell><div className="flex items-center justify-end gap-1">
                <MaterialDetailDialog materialId={material.id} name={material.name} table={material.source} startEditing trigger={<Button variant="ghost" size="compactIcon" className="!h-6 !w-6 shrink-0" title={`Editar ${material.name}`} aria-label={`Editar ${material.name}`}><Pencil className="h-3.5 w-3.5" /></Button>} />
                <DeleteMaterialButton material={material} />
              </div></TableCell>
            </TableRow>)}</TableBody>
          </Table>}
        </CardContent>
      </CollapsibleContent>
    </Card>
  </Collapsible>;
}

export function MyioDevicesRegistryTab() {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const { data: devices = [], isLoading } = useMyioDevices();
  const filtered = useMemo(() => {
    const term = normalize(search.trim());
    if (!term) return devices;
    return devices.filter((item) => normalize(`${item.name} ${item.description ?? ""} ${item.manufacturer_code ?? ""}`).includes(term));
  }, [devices, search]);

  return <Collapsible open={expanded} onOpenChange={setExpanded} asChild>
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Dispositivos myio</CardTitle>
          {expanded && <CardDescription>Produtos fabricados myio disponíveis para solicitações.</CardDescription>}
        </div>
        <CollapsibleTrigger asChild>
          <Button size="compactIcon" variant="ghost" aria-label={expanded ? "Recolher Dispositivos myio" : "Expandir Dispositivos myio"} title={expanded ? "Recolher" : "Expandir"}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5"  /> : <ChevronDown className="h-3.5 w-3.5"  />}
          </Button>
        </CollapsibleTrigger>
      </CardHeader>
      <CollapsibleContent asChild>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar dispositivo..." className="pl-9" />
          </div>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : !filtered.length ? <p className="text-sm text-muted-foreground">Nenhum dispositivo encontrado.</p> : <Table>
            <TableHeader><TableRow><TableHead>Dispositivo</TableHead><TableHead>Cód. Fabricante</TableHead><TableHead className="w-16" /></TableRow></TableHeader>
            <TableBody>{filtered.map((device) => <TableRow key={device.id}>
              <TableCell><div className="font-medium">{device.name}</div>{device.description && <div className="max-w-xl truncate text-xs text-muted-foreground">{device.description}</div>}</TableCell>
              <TableCell>{device.manufacturer_code || "—"}</TableCell>
              <TableCell><MaterialDetailDialog materialId={device.id} name={device.name} table="materials" trigger={<Button variant="ghost" size="compactIcon" className="!h-6 !w-6 shrink-0" title={`Editar ${device.name}`} aria-label={`Editar ${device.name}`}><Pencil className="h-3.5 w-3.5" /></Button>} /></TableCell>
            </TableRow>)}</TableBody>
          </Table>}
        </CardContent>
      </CollapsibleContent>
    </Card>
  </Collapsible>;
}